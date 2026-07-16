"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { hostStudents, participants, activities, events, registrations, payments } from "@/db/schema";
import { requirePermission } from "./auth";
import {
  hostLogin,
  getHostStudent,
  requireHostStudent,
  destroyHostSession,
  hostSchoolId,
} from "./host-auth";
import { atActivityCap } from "./registration";
import { uploadSlip } from "./storage";
import type { AuthState } from "./auth-actions";

/** Bulk-import host students from pasted CSV: rollNumber,cnic,name,class (FR-9).
 *  ponytail: naive split — no quoted-field/embedded-comma handling. Swap for a
 *  CSV parser if rosters ever contain commas inside fields. */
export async function importHostStudents(formData: FormData) {
  await requirePermission("user.manage");
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) return;

  for (const line of csv.split(/\r?\n/)) {
    const [rollNumber, cnic, name, className] = line.split(",").map((s) => s.trim());
    if (!rollNumber || !cnic || !name) continue;
    if (/roll/i.test(rollNumber) && /cnic/i.test(cnic)) continue; // skip a header row
    await db
      .insert(hostStudents)
      .values({ rollNumber, cnic, name, className: className || null })
      .onConflictDoUpdate({
        target: hostStudents.rollNumber,
        set: { cnic, name, className: className || null },
      });
  }
  revalidatePath("/admin/users");
}

export async function hostLoginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const rollNumber = String(formData.get("rollNumber") ?? "");
  const cnic = String(formData.get("cnic") ?? "");
  if (!rollNumber || !cnic) return { error: "Enter your roll number and CNIC." };
  const ok = await hostLogin(rollNumber, cnic);
  if (!ok) return { error: "No match, or too many attempts. Try again later." };
  redirect("/student");
}

export async function hostLogout() {
  await destroyHostSession();
  redirect("/student/login");
}

/** Ensure the host student has a participant row (created lazily, host school). */
async function ensureParticipant(): Promise<{ studentId: string; participantId: string } | null> {
  const s = await getHostStudent();
  if (!s) return null;
  if (s.participantId) return { studentId: s.id, participantId: s.participantId };
  const schoolId = await hostSchoolId();
  const [p] = await db
    .insert(participants)
    .values({ schoolId, name: s.name })
    .returning({ id: participants.id });
  await db.update(hostStudents).set({ participantId: p.id }).where(eq(hostStudents.id, s.id));
  return { studentId: s.id, participantId: p.id };
}

export async function hostRegisterActivity(formData: FormData) {
  await requireHostStudent();
  const activityId = String(formData.get("activityId") ?? "");
  const ctx = await ensureParticipant();
  if (!ctx) return;

  // Activity must belong to an OPEN event.
  const [a] = await db
    .select({ eventId: activities.eventId })
    .from(activities)
    .innerJoin(events, eq(events.id, activities.eventId))
    .where(and(eq(activities.id, activityId), eq(events.status, "open")));
  if (!a) return;
  if (await atActivityCap(ctx.participantId, a.eventId)) return; // FR-3a

  await db
    .insert(registrations)
    .values({ participantId: ctx.participantId, activityId })
    .onConflictDoNothing();
  revalidatePath("/student");
}

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** One slip per student per event (payerType participant, scoped by eventId). */
export async function hostSubmitPayment(formData: FormData) {
  await requireHostStudent();
  const eventId = String(formData.get("eventId") ?? "");
  const file = formData.get("slip");
  const ctx = await ensureParticipant();
  if (!ctx || !eventId) return;
  if (!(file instanceof File) || file.size === 0) return;
  if (!ALLOWED.has(file.type) || file.size > MAX_BYTES) return;

  const slipRef = await uploadSlip(file);
  await db
    .insert(payments)
    .values({ payerType: "participant", payerId: ctx.participantId, eventId, slipRef });
  revalidatePath("/student");
}
