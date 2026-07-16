"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
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
