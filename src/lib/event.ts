import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

/** True once the event's end date is past. endDate is a "YYYY-MM-DD" string, so
 *  a lexical compare against today's date is correct. */
export function hasEnded(endDate: string | null): boolean {
  return !!endDate && endDate < new Date().toISOString().slice(0, 10);
}

// Fixed vocabulary of who may self-register for an event (registerableBy).
export const REGISTRATION_TARGETS = ["delegation", "host_student", "visitor"] as const;
export type RegistrationTarget = (typeof REGISTRATION_TARGETS)[number];

const targetMatch = (target: RegistrationTarget) =>
  sql`${events.registerableBy} ? ${target}`; // jsonb array "contains string"

// An event is only "open" for registration if its end date hasn't passed —
// even when status is still stored as 'open', an ended event is closed.
const notEnded = () => {
  const today = new Date().toISOString().slice(0, 10);
  return sql`(${events.endDate} is null or ${events.endDate} >= ${today})`;
};

/** OPEN events visible to a given registration surface (target not opted out). */
export async function openEventsFor(target: RegistrationTarget) {
  return db
    .select({ id: events.id, name: events.name, type: events.type })
    .from(events)
    .where(and(eq(events.status, "open"), targetMatch(target), notEnded()));
}

/** True if the event is open AND accepting that registration surface. */
export async function eventOpenFor(eventId: string, target: RegistrationTarget) {
  const [ev] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.status, "open"),
        targetMatch(target),
        notEnded(),
      ),
    );
  return !!ev;
}
