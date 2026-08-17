"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  delegationRegistrations,
  participants,
  activities,
  registrations,
  teams,
  teamMembers,
  credentials,
  payments,
} from "@/db/schema";
import { requireUser } from "./auth";
import { remainingActivitySlots } from "./registration";
import { issueParticipant } from "./credentials";

// The one ownership gate: caller must be the coordinator of this APPROVED
// registration. Returns {schoolId, eventId} or null — every action bails on null.
async function ownedReg(regId: string) {
  const user = await requireUser();
  const [reg] = await db
    .select({
      schoolId: delegationRegistrations.schoolId,
      eventId: delegationRegistrations.eventId,
    })
    .from(delegationRegistrations)
    .where(
      and(
        eq(delegationRegistrations.id, regId),
        eq(delegationRegistrations.coordinatorUserId, user.id),
        eq(delegationRegistrations.status, "approved"),
      ),
    );
  return reg ?? null;
}

async function activityInEvent(activityId: string, eventId: string) {
  const [a] = await db
    .select({ teamBased: activities.teamBased })
    .from(activities)
    .where(and(eq(activities.id, activityId), eq(activities.eventId, eventId)));
  return a ?? null;
}

async function participantInSchool(participantId: string, schoolId: string) {
  const [p] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.schoolId, schoolId)));
  return !!p;
}

export async function addParticipant(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return "You can only edit an approved delegation you coordinate.";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Student name is required.";

  const idNumber = String(formData.get("idNumber") ?? "").trim();
  if (!idNumber) return "CNIC / smart card / B-form number is required.";
  const gender = String(formData.get("gender") ?? "");
  if (gender !== "male" && gender !== "female") return "Select a gender.";
  const dob = String(formData.get("dob") ?? "").trim() || null;
  if (!dob) return "Date of birth is required.";

  const [dup] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.idNumber, idNumber));
  if (dup) return "This CNIC / smart card / B-form number is already registered.";

  const [participant] = await db
    .insert(participants)
    .values({ schoolId: reg.schoolId, name, idNumber, gender, dob })
    .returning({ id: participants.id });

  // Register for games in the same step: checked activities for this event.
  const chosen = [...new Set(formData.getAll("activityId").map(String))];
  const actRows = chosen.length
    ? await db
        .select({ id: activities.id })
        .from(activities)
        .where(and(eq(activities.eventId, reg.eventId), inArray(activities.id, chosen)))
    : [];
  let remaining = await remainingActivitySlots(participant.id, reg.eventId);
  for (const activityId of actRows.map((a) => a.id)) {
    if (remaining === 0) break;
    await db
      .insert(registrations)
      .values({ participantId: participant.id, activityId })
      .onConflictDoNothing();
    if (remaining !== null) remaining -= 1;
  }
  // Mint the card as soon as the student is created (idempotent).
  await issueParticipant(participant.id, reg.eventId);
  revalidatePath("/delegation");
  return "";
}

/** Sync an existing student's games from the checked set (add/remove inline). */
export async function setStudentGames(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return "You can only edit an approved delegation you coordinate.";
  const participantId = String(formData.get("participantId") ?? "");
  if (!(await participantInSchool(participantId, reg.schoolId))) return "Student not found.";

  const chosen = new Set(formData.getAll("activityId").map(String));
  const actRows = chosen.size
    ? await db
        .select({ id: activities.id })
        .from(activities)
        .where(and(eq(activities.eventId, reg.eventId), inArray(activities.id, [...chosen])))
    : [];
  const validChosen = new Set(actRows.map((a) => a.id));

  const existingRows = await db
    .select({ activityId: registrations.activityId })
    .from(registrations)
    .innerJoin(activities, eq(activities.id, registrations.activityId))
    .where(
      and(
        eq(registrations.participantId, participantId),
        eq(activities.eventId, reg.eventId),
      ),
    );
  const existing = new Set(existingRows.map((r) => r.activityId));
  const toRemove = [...existing].filter((a) => !validChosen.has(a));
  let toAdd = [...validChosen].filter((a) => !existing.has(a));

  if (toRemove.length) {
    await db
      .delete(registrations)
      .where(
        and(
          eq(registrations.participantId, participantId),
          inArray(registrations.activityId, toRemove),
        ),
      );
  }
  // Respect the per-participant cap after removals are applied.
  const remaining = await remainingActivitySlots(participantId, reg.eventId);
  if (remaining !== null) toAdd = toAdd.slice(0, remaining);
  if (toAdd.length) {
    await db
      .insert(registrations)
      .values(toAdd.map((activityId) => ({ participantId, activityId })))
      .onConflictDoNothing();
  }

  await issueParticipant(participantId, reg.eventId);
  revalidatePath("/delegation");
  return remaining === 0 ? "This student is at their activity limit." : "";
}

export async function registerParticipant(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return;
  const participantId = String(formData.get("participantId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  if (!(await activityInEvent(activityId, reg.eventId))) return;
  if (!(await participantInSchool(participantId, reg.schoolId))) return;
  if ((await remainingActivitySlots(participantId, reg.eventId)) === 0) return; // FR-3a

  await db
    .insert(registrations)
    .values({ participantId, activityId })
    .onConflictDoNothing();
  // Delegation fee is approved at registration approval; mint the student's
  // credential here so cards exist as soon as they're registered (idempotent).
  await issueParticipant(participantId, reg.eventId);
  revalidatePath("/delegation");
}

export async function updateParticipant(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return "You can only edit an approved delegation you coordinate.";
  const participantId = String(formData.get("participantId") ?? "");
  if (!(await participantInSchool(participantId, reg.schoolId))) return "Student not found.";

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Student name is required.";
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  if (!idNumber) return "CNIC / smart card / B-form number is required.";
  const gender = String(formData.get("gender") ?? "");
  if (gender !== "male" && gender !== "female") return "Select a gender.";
  const dob = String(formData.get("dob") ?? "").trim() || null;
  if (!dob) return "Date of birth is required.";

  // Uniqueness excluding this student.
  const [dup] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.idNumber, idNumber), ne(participants.id, participantId)));
  if (dup) return "This CNIC / smart card / B-form number is already registered.";

  await db
    .update(participants)
    .set({ name, idNumber, gender, dob })
    .where(eq(participants.id, participantId));
  revalidatePath("/delegation");
  return "";
}

export async function deleteParticipant(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return;
  const participantId = String(formData.get("participantId") ?? "");
  if (!(await participantInSchool(participantId, reg.schoolId))) return;

  // credentials.holderId is not an FK — clean up manually. registrations and
  // team members cascade off the participant row.
  await db
    .delete(credentials)
    .where(
      and(eq(credentials.holderType, "participant"), eq(credentials.holderId, participantId)),
    );
  await db
    .delete(payments)
    .where(and(eq(payments.payerType, "participant"), eq(payments.payerId, participantId)));
  await db.delete(participants).where(eq(participants.id, participantId));
  revalidatePath("/delegation");
}

export async function createTeam(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return;
  const activityId = String(formData.get("activityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const a = await activityInEvent(activityId, reg.eventId);
  if (!a || !a.teamBased || !name) return;
  await db.insert(teams).values({ activityId, schoolId: reg.schoolId, name });
  revalidatePath("/delegation");
}

export async function addTeamMember(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return;
  const teamId = String(formData.get("teamId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  // Team must belong to this school; participant too.
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.schoolId, reg.schoolId)));
  if (!team || !(await participantInSchool(participantId, reg.schoolId))) return;
  await db.insert(teamMembers).values({ teamId, participantId }).onConflictDoNothing();
  revalidatePath("/delegation");
}
