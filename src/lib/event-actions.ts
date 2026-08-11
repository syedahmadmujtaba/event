"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, activities, eventFeeRules } from "@/db/schema";
import { requirePermission } from "./auth";
import { hasEnded, REGISTRATION_TARGETS } from "./event";

const STATUSES = new Set(["draft", "open", "closed"]);
const TARGETS = new Set<string>(REGISTRATION_TARGETS);
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

  const status = STATUSES.has(String(formData.get("status") ?? ""))
    ? String(formData.get("status"))
    : "draft";
  const rawCap = String(formData.get("maxActivitiesPerParticipant") ?? "").trim();
  const cap =
    rawCap === "" ? null : Math.max(1, Math.trunc(Number(rawCap)));
  const targets = formData
    .getAll("target")
    .map(String)
    .filter((t) => TARGETS.has(t));

  const [event] = await db
    .insert(events)
    .values({
      name,
      type: String(formData.get("type") ?? "").trim() || null,
      startDate: String(formData.get("startDate") ?? "") || null,
      endDate: String(formData.get("endDate") ?? "") || null,
      status,
      registerableBy: targets,
      maxActivitiesPerParticipant: cap !== null && Number.isFinite(cap) ? cap : null,
    })
    .returning({ id: events.id });

  const activitiesData = [...formData.keys()]
    .filter((k) => k.startsWith("activityName_"))
    .map((k) => Number(k.slice("activityName_".length)))
    .sort((a, b) => a - b)
    .map((i) => {
      const actName = String(formData.get(`activityName_${i}`) ?? "").trim();
      if (!actName) return null;
      const price = Math.max(0, Math.trunc(Number(formData.get(`activityPrice_${i}`) ?? 0)) || 0);
      return {
        name: actName,
        price,
        teamBased: formData.get(`activityTeamBased_${i}`) === "on",
      };
    })
    .filter((a): a is { name: string; price: number; teamBased: boolean } => a !== null);
  if (activitiesData.length) {
    await db
      .insert(activities)
      .values(activitiesData.map((a) => ({ eventId: event.id, ...a })));
  }

  const fees = [...formData.keys()]
    .filter((k) => k.startsWith("feePayer_"))
    .map((k) => Number(k.slice("feePayer_".length)))
    .sort((a, b) => a - b)
    .map((i) => {
      const payerType = String(formData.get(`feePayer_${i}`) ?? "");
      if (!PAYER_TYPES.has(payerType)) return null;
      const amount = Math.trunc(Number(formData.get(`feeAmount_${i}`)));
      if (!Number.isFinite(amount) || amount < 0) return null;
      return { payerType, amount };
    })
    .filter((f): f is { payerType: string; amount: number } => f !== null);
  if (fees.length) {
    await db
      .insert(eventFeeRules)
      .values(fees.map((f) => ({ eventId: event.id, ...f })));
  }

  revalidatePath("/admin/events");
}

export async function setEventStatus(formData: FormData) {
  await requirePermission("event.manage");
  const id = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.has(status)) return;

  // Can't (re)open an event whose end date has passed. Closing is always allowed.
  if (status === "open") {
    const [ev] = await db.select({ endDate: events.endDate }).from(events).where(eq(events.id, id));
    if (!ev || hasEnded(ev.endDate)) return;
  }

  await db.update(events).set({ status }).where(eq(events.id, id));
  revalidatePath("/admin/events");
}

export async function createActivity(formData: FormData) {
  await requirePermission("event.manage");
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!eventId || !name) return;
  const price = Math.max(0, Math.trunc(Number(formData.get("price") ?? 0)) || 0);
  await db.insert(activities).values({
    eventId,
    name,
    price,
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
  if (!eventId || !PAYER_TYPES.has(payerType) || !Number.isFinite(amount) || amount < 0) return;
  await db
    .insert(eventFeeRules)
    .values({ eventId, payerType, amount })
    .onConflictDoUpdate({
      target: [eventFeeRules.eventId, eventFeeRules.payerType],
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

export async function setRegistrationTargets(formData: FormData) {
  await requirePermission("event.manage");
  const eventId = String(formData.get("eventId") ?? "");
  const targets = formData
    .getAll("target")
    .map(String)
    .filter((t) => TARGETS.has(t));
  await db
    .update(events)
    .set({ registerableBy: targets })
    .where(eq(events.id, eventId));
  revalidatePath(`/admin/events/${eventId}`);
}
