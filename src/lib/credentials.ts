import "server-only";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  credentials,
  delegationRegistrations,
  participants,
  registrations,
  activities,
} from "@/db/schema";

const token = () => randomBytes(16).toString("hex");

/** QR PNG data-URI encoding the public credential URL. */
export async function qrDataUrl(qrToken: string): Promise<string> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return QRCode.toDataURL(`${base}/credential/${qrToken}`, { margin: 1, width: 220 });
}

/**
 * Issue credentials for a delegation once its payment is verified (FR-16):
 * one delegation card + one card per participant registered in the event.
 * Idempotent — safe to call again on re-approval.
 */
export async function issueForDelegation(regId: string) {
  const [reg] = await db
    .select({ schoolId: delegationRegistrations.schoolId, eventId: delegationRegistrations.eventId })
    .from(delegationRegistrations)
    .where(eq(delegationRegistrations.id, regId));
  if (!reg) return;

  const rows: (typeof credentials.$inferInsert)[] = [
    { holderType: "delegation_registration", holderId: regId, eventId: reg.eventId, qrToken: token() },
  ];

  // Distinct participants of this school with a registration in this event.
  const parts = await db
    .selectDistinct({ id: participants.id })
    .from(participants)
    .innerJoin(registrations, eq(registrations.participantId, participants.id))
    .innerJoin(activities, eq(activities.id, registrations.activityId))
    .where(and(eq(participants.schoolId, reg.schoolId), eq(activities.eventId, reg.eventId)));

  for (const p of parts) {
    rows.push({ holderType: "participant", holderId: p.id, eventId: reg.eventId, qrToken: token() });
  }

  await db.insert(credentials).values(rows).onConflictDoNothing();
}

/** Issue a single participant credential (host-student path). Idempotent. */
export async function issueParticipant(participantId: string, eventId: string) {
  await db
    .insert(credentials)
    .values({ holderType: "participant", holderId: participantId, eventId, qrToken: token() })
    .onConflictDoNothing();
}
