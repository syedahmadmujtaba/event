"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  delegationRegistrations,
  participants,
  activities,
  registrations,
  teams,
  teamMembers,
} from "@/db/schema";
import { requireUser } from "./auth";
import { atActivityCap } from "./registration";

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
  if (!reg) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(participants).values({
    schoolId: reg.schoolId,
    name,
    detail: String(formData.get("detail") ?? "").trim() || null,
  });
  revalidatePath("/delegation");
}

export async function registerParticipant(formData: FormData) {
  const reg = await ownedReg(String(formData.get("regId") ?? ""));
  if (!reg) return;
  const participantId = String(formData.get("participantId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  if (!(await activityInEvent(activityId, reg.eventId))) return;
  if (!(await participantInSchool(participantId, reg.schoolId))) return;
  if (await atActivityCap(participantId, reg.eventId)) return; // FR-3a

  await db
    .insert(registrations)
    .values({ participantId, activityId })
    .onConflictDoNothing();
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
