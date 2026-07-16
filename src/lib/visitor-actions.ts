"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { visitors, visitorTickets, payments, events } from "@/db/schema";
import { uploadSlip } from "./storage";
import type { AuthState } from "./auth-actions";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Public visitor self-registration for one open event (FR-22). */
export async function registerVisitor(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const cnic = String(formData.get("cnic") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const association = String(formData.get("association") ?? "").trim();
  if (!eventId || !name || !cnic) return { error: "Name, CNIC, and event are required." };

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.status, "open")));
  if (!event) return { error: "That event is not open." };

  const [visitor] = await db
    .insert(visitors)
    .values({ name, cnic, phone: phone || null, association: association || null })
    .returning({ id: visitors.id });

  const token = randomBytes(16).toString("hex");
  await db.insert(visitorTickets).values({ visitorId: visitor.id, eventId, token });
  redirect(`/visitor/${token}`);
}

export async function submitVisitorPayment(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const file = formData.get("slip");
  const [ticket] = await db
    .select({ id: visitorTickets.id, eventId: visitorTickets.eventId, status: visitorTickets.status })
    .from(visitorTickets)
    .where(eq(visitorTickets.token, token));
  if (!ticket || ticket.status === "verified") return;
  if (!(file instanceof File) || file.size === 0) return;
  if (!ALLOWED.has(file.type) || file.size > MAX_BYTES) return;

  const slipRef = await uploadSlip(file);
  await db
    .insert(payments)
    .values({ payerType: "visitor_ticket", payerId: ticket.id, eventId: ticket.eventId, slipRef });
  revalidatePath(`/visitor/${token}`);
}
