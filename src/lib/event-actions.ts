"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, activities } from "@/db/schema";
import { requirePermission } from "./auth";

const STATUSES = new Set(["draft", "open", "closed"]);

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
