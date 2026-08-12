"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { payments, delegationRegistrations, users, visitorTickets, visitors } from "@/db/schema";
import { requireUser, requirePermission } from "./auth";
import { uploadSlip, deleteStored } from "./storage";
import { sendMail, sendWhatsApp } from "./mailer";
import { issueForDelegation, issueParticipant, issueVisitor } from "./credentials";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Coordinator uploads a payment slip for their own delegation (FR-13).
 *  Allowed while pending (so the admin reviews slip + registration together)
 *  and after approval. Re-uploads just create a newer row; latest wins. */
export async function submitDelegationPayment(formData: FormData) {
  const user = await requireUser();
  const regId = String(formData.get("regId") ?? "");
  const file = formData.get("slip");

  // Ownership: must be the coordinator of this non-rejected registration.
  const [reg] = await db
    .select({ id: delegationRegistrations.id })
    .from(delegationRegistrations)
    .where(
      and(
        eq(delegationRegistrations.id, regId),
        eq(delegationRegistrations.coordinatorUserId, user.id),
        ne(delegationRegistrations.status, "rejected"),
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
  revalidatePath("/admin/delegations");
}

/** Coordinator removes the latest pending slip for their own delegation, so they
 *  can replace it before the admin approves (delete-and-reupload). Once a slip
 *  is approved (or its delegation is), it can no longer be deleted. */
export async function deleteDelegationPayment(formData: FormData) {
  const user = await requireUser();
  const regId = String(formData.get("regId") ?? "");

  const [reg] = await db
    .select({ id: delegationRegistrations.id })
    .from(delegationRegistrations)
    .where(
      and(
        eq(delegationRegistrations.id, regId),
        eq(delegationRegistrations.coordinatorUserId, user.id),
        ne(delegationRegistrations.status, "rejected"),
      ),
    );
  if (!reg) return;

  const [pay] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.payerType, "delegation_registration"),
        eq(payments.payerId, regId),
        eq(payments.status, "submitted"),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!pay) return;

  await db.delete(payments).where(eq(payments.id, pay.id));
  await deleteStored(pay.slipRef);
  revalidatePath("/delegation");
  revalidatePath("/admin/delegations");
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

  // On approval, issue QR credentials (FR-16).
  if (status === "approved" && pay.payerType === "delegation_registration") {
    await issueForDelegation(pay.payerId);
  }
  if (status === "approved" && pay.payerType === "participant" && pay.eventId) {
    await issueParticipant(pay.payerId, pay.eventId);
  }
  if (pay.payerType === "visitor_ticket" && pay.eventId) {
    if (status === "approved") {
      await db.update(visitorTickets).set({ status: "verified" }).where(eq(visitorTickets.id, pay.payerId));
      await issueVisitor(pay.payerId, pay.eventId);
    }
    // Visitors give a phone, not an email → notify by WhatsApp (FR-26).
    const [v] = await db
      .select({ phone: visitors.phone })
      .from(visitorTickets)
      .innerJoin(visitors, eq(visitors.id, visitorTickets.visitorId))
      .where(eq(visitorTickets.id, pay.payerId));
    sendWhatsApp(
      v?.phone,
      status === "approved"
        ? "Your Eventide entry ticket is verified."
        : `Your payment was rejected.${reason ? ` Reason: ${reason}` : ""} Please re-upload.`,
    );
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
