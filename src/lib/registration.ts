import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, registrations, activities } from "@/db/schema";

/** True if the participant is at/over this event's per-participant activity cap (FR-3a). */
export async function atActivityCap(participantId: string, eventId: string): Promise<boolean> {
  return (await remainingActivitySlots(participantId, eventId)) === 0;
}

/** Remaining activity slots for the participant at this event (null = unlimited). */
export async function remainingActivitySlots(
  participantId: string,
  eventId: string,
): Promise<number | null> {
  const [ev] = await db
    .select({ cap: events.maxActivitiesPerParticipant })
    .from(events)
    .where(eq(events.id, eventId));
  if (ev?.cap == null) return null;
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(registrations)
    .innerJoin(activities, eq(activities.id, registrations.activityId))
    .where(and(eq(registrations.participantId, participantId), eq(activities.eventId, eventId)));
  return Math.max(0, ev.cap - n);
}
