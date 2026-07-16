"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams, registrations } from "@/db/schema";
import { requirePermission } from "./auth";

const STATUSES = new Set(["scheduled", "ongoing", "completed"]);
const WINNERS = new Set(["a", "b", "draw"]);

/** A side must be a team of the activity, or a participant registered in it. */
async function validSide(activityId: string, type: string, id: string): Promise<boolean> {
  if (type === "team") {
    const [t] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.activityId, activityId)));
    return !!t;
  }
  if (type === "participant") {
    const [r] = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.participantId, id), eq(registrations.activityId, activityId)));
    return !!r;
  }
  return false;
}

export async function createMatch(formData: FormData) {
  await requirePermission("match.manage");
  const activityId = String(formData.get("activityId") ?? "");
  const sideType = String(formData.get("sideType") ?? ""); // both sides same type per activity
  const sideAId = String(formData.get("sideAId") ?? "");
  const sideBId = String(formData.get("sideBId") ?? "");
  if (!activityId || sideAId === sideBId) return;
  if (!(await validSide(activityId, sideType, sideAId))) return;
  if (!(await validSide(activityId, sideType, sideBId))) return;

  const when = String(formData.get("scheduledAt") ?? "");
  await db.insert(matches).values({
    activityId,
    sideAType: sideType,
    sideAId,
    sideBType: sideType,
    sideBId,
    scheduledAt: when ? new Date(when) : null,
    venue: String(formData.get("venue") ?? "").trim() || null,
  });
  revalidatePath("/admin/matches");
}

export async function setMatchStatus(formData: FormData) {
  await requirePermission("match.manage");
  const id = String(formData.get("matchId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.has(status)) return;
  await db.update(matches).set({ status }).where(eq(matches.id, id));
  revalidatePath("/admin/matches");
}

export async function setMatchResult(formData: FormData) {
  const admin = await requirePermission("match.manage");
  const id = String(formData.get("matchId") ?? "");
  const winnerSide = String(formData.get("winnerSide") ?? "");
  if (!WINNERS.has(winnerSide)) return;
  await db
    .update(matches)
    .set({
      status: "completed",
      result: String(formData.get("result") ?? "").trim() || null,
      winnerSide,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(matches.id, id));
  revalidatePath("/admin/matches");
}

export async function deleteMatch(formData: FormData) {
  await requirePermission("match.manage");
  await db.delete(matches).where(eq(matches.id, String(formData.get("matchId") ?? "")));
  revalidatePath("/admin/matches");
}
