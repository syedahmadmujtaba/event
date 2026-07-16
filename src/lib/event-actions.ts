"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, activities, eventFeeRules } from "@/db/schema";
import { requirePermission } from "./auth";

const STATUSES = new Set(["draft", "open", "closed"]);
const PAYER_TYPES = new Set([
  "host_student",
  "delegation_student",
  "delegation_registration",
  "visitor",
]);

export async function createEvent(formData: FormData) {
  await requirePermission("event.manage");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(events).values({
    name,
    type: String(formData.get("type") ?? "").trim() || null,
    startDate: String(formData.get("startDate") ?? "") || null,
    endDate: String(formData.get("endDate") ?? "") || null,
  });
  revalidatePath("/admin/events");
}

export async function setEventStatus(formData: FormData) {
  await requirePermission("event.manage");
  const id = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.has(status)) return;
  await db.update(events).set({ status }).where(eq(events.id, id));
  revalidatePath("/admin/events");
}

export async function createActivity(formData: FormData) {
  await requirePermission("event.manage");
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) return;
  await db.insert(activities).values({
    eventId,
    name,
    kind: formData.get("kind") === "noncompetitive" ? "noncompetitive" : "competitive",
    teamBased: formData.get("teamBased") === "on",
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteActivity(formData: FormData) {
  await requirePermission("event.manage");
  const id = String(formData.get("activityId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  await db.delete(activities).where(eq(activities.id, id));
  revalidatePath(`/admin/events/${eventId}`);
}

export async function setActivityCap(formData: FormData) {
  await requirePermission("event.manage");
  const eventId = String(formData.get("eventId") ?? "");
  const raw = String(formData.get("cap") ?? "").trim();
  const cap = raw === "" ? null : Math.max(1, Math.trunc(Number(raw)));
  if (cap !== null && !Number.isFinite(cap)) return;
  await db
    .update(events)
    .set({ maxActivitiesPerParticipant: cap })
    .where(eq(events.id, eventId));
  revalidatePath(`/admin/events/${eventId}`);
}

export async function createFeeRule(formData: FormData) {
  await requirePermission("event.manage");
  const eventId = String(formData.get("eventId") ?? "");
  const payerType = String(formData.get("payerType") ?? "");
  const amount = Math.trunc(Number(formData.get("amount")));
  const day = Math.max(0, Math.trunc(Number(formData.get("day") ?? 0)) || 0);
  if (!eventId || !PAYER_TYPES.has(payerType) || !Number.isFinite(amount) || amount < 0) return;
  await db
    .insert(eventFeeRules)
    .values({ eventId, payerType, amount, day })
    .onConflictDoUpdate({
      target: [eventFeeRules.eventId, eventFeeRules.payerType, eventFeeRules.day],
      set: { amount },
    });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteFeeRule(formData: FormData) {
  await requirePermission("event.manage");
  const id = String(formData.get("ruleId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  await db.delete(eventFeeRules).where(eq(eventFeeRules.id, id));
  revalidatePath(`/admin/events/${eventId}`);
}
