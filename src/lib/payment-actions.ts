"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, delegationRegistrations, users } from "@/db/schema";
import { requireUser, requirePermission } from "./auth";
import { uploadSlip } from "./storage";
import { sendMail } from "./mailer";
import { issueForDelegation } from "./credentials";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Coordinator uploads a payment slip for their own approved delegation (FR-13). */
export async function submitDelegationPayment(formData: FormData) {
  const user = await requireUser();
  const regId = String(formData.get("regId") ?? "");
  const file = formData.get("slip");

  // Ownership: must be the coordinator of this approved registration.
  const [reg] = await db
    .select({ id: delegationRegistrations.id })
    .from(delegationRegistrations)
    .where(
      and(
        eq(delegationRegistrations.id, regId),
        eq(delegationRegistrations.coordinatorUserId, user.id),
        eq(delegationRegistrations.status, "approved"),
      ),
    );
  if (!reg) return;

  // Trust-boundary validation (client also gates via accept/required).
  if (!(file instanceof File) || file.size === 0) return;
  if (!ALLOWED.has(file.type)) return;
  if (file.size > MAX_BYTES) return;

  const slipRef = await uploadSlip(file);
  await db.insert(payments).values({
    payerType: "delegation_registration",
    payerId: regId,
    slipRef,
  });
  revalidatePath("/delegation");
}

async function decide(paymentId: string, status: "approved" | "rejected", reason?: string) {
  const admin = await requirePermission("payment.verify");
  const [pay] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!pay || pay.status !== "submitted") return;

  await db
    .update(payments)
    .set({
      status,
      rejectionReason: reason ?? null,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  // On approval, issue QR credentials for the delegation + its participants (FR-16).
  if (status === "approved" && pay.payerType === "delegation_registration") {
    await issueForDelegation(pay.payerId);
  }

  // Notify the delegation coordinator (FR-15/27). Other payer types wired later.
  if (pay.payerType === "delegation_registration") {
    const [row] = await db
      .select({ email: users.email })
      .from(delegationRegistrations)
      .innerJoin(users, eq(users.id, delegationRegistrations.coordinatorUserId))
      .where(eq(delegationRegistrations.id, pay.payerId));
    if (row) {
      sendMail(
        row.email,
        `Payment ${status}`,
        status === "approved"
          ? `<p>Your payment was verified.</p>`
          : `<p>Your payment was rejected.${reason ? ` Reason: ${reason}` : ""} Please re-upload.</p>`,
      );
    }
  }
  revalidatePath("/admin/payments");
}

export async function approvePayment(formData: FormData) {
  await decide(String(formData.get("paymentId") ?? ""), "approved");
}

export async function rejectPayment(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  await decide(String(formData.get("paymentId") ?? ""), "rejected", reason);
}
