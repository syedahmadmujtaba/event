"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  roles,
  userRoles,
  schools,
  events,
  delegationRegistrations,
} from "@/db/schema";
import { hashPassword } from "./password";
import { requirePermission } from "./auth";
import { createVerificationUrl } from "./email-verification";
import { sendMail } from "./mailer";
import type { AuthState } from "./auth-actions";

/** Public delegation self-registration for one open event (FR-4). */
export async function registerDelegation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "");

  if (!name || !email || !schoolName || !city || !eventId || password.length < 8) {
    return { error: "Fill every field; password must be at least 8 characters." };
  }

  // Re-check the event is open — never trust the dropdown.
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.status, "open")));
  if (!event) return { error: "That event is not open for registration." };

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existingUser) {
    return { error: "An account with that email exists — please log in instead." };
  }

  // Match-or-create the reusable school on (name, city).
  const [school] =
    (await db
      .select({ id: schools.id })
      .from(schools)
      .where(and(eq(schools.name, schoolName), eq(schools.city, city)))) ?? [];
  const schoolId =
    school?.id ??
    (
      await db
        .insert(schools)
        .values({ name: schoolName, city })
        .returning({ id: schools.id })
    )[0].id;

  const [dup] = await db
    .select({ id: delegationRegistrations.id })
    .from(delegationRegistrations)
    .where(
      and(
        eq(delegationRegistrations.schoolId, schoolId),
        eq(delegationRegistrations.eventId, eventId),
      ),
    );
  if (dup) return { error: "This school is already registered for that event." };

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning({ id: users.id });

  await db.insert(delegationRegistrations).values({
    schoolId,
    eventId,
    coordinatorUserId: user.id,
  });

  const url = await createVerificationUrl(user.id);
  sendMail(
    email,
    "Verify your Eventide delegation account",
    `<p>Hi ${name}, confirm your email to submit your delegation for review:</p>
     <p><a href="${url}">Verify my email</a></p>`,
  );

  redirect("/register/check-email");
}

export async function approveDelegation(formData: FormData) {
  const admin = await requirePermission("delegation.approve");
  const id = String(formData.get("registrationId") ?? "");

  const [reg] = await db
    .select()
    .from(delegationRegistrations)
    .where(eq(delegationRegistrations.id, id));
  if (!reg || reg.status !== "pending") return;

  const [coordRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, "Delegation Coordinator"));

  await db
    .update(delegationRegistrations)
    .set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date() })
    .where(eq(delegationRegistrations.id, id));

  if (coordRole) {
    // Event-scoped coordinator role. onConflictDoNothing: safe on re-approve.
    await db
      .insert(userRoles)
      .values({
        userId: reg.coordinatorUserId,
        roleId: coordRole.id,
        eventId: reg.eventId,
      })
      .onConflictDoNothing();
  }

  const [coord] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, reg.coordinatorUserId));
  if (coord) {
    sendMail(
      coord.email,
      "Your delegation is approved",
      `<p>Your delegation has been approved. You can now register students.</p>`,
    );
  }
  revalidatePath("/admin/delegations");
}

export async function rejectDelegation(formData: FormData) {
  const admin = await requirePermission("delegation.approve");
  const id = String(formData.get("registrationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const [reg] = await db
    .select()
    .from(delegationRegistrations)
    .where(eq(delegationRegistrations.id, id));
  if (!reg || reg.status !== "pending") return;

  await db
    .update(delegationRegistrations)
    .set({
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(delegationRegistrations.id, id));

  const [coord] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, reg.coordinatorUserId));
  if (coord) {
    sendMail(
      coord.email,
      "Your delegation registration was rejected",
      `<p>Your registration was rejected.${reason ? ` Reason: ${reason}` : ""}</p>`,
    );
  }
  revalidatePath("/admin/delegations");
}
