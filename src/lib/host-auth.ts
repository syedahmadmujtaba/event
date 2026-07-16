import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { hostSessions, hostStudents, schools } from "@/db/schema";

const COOKIE = "host_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type HostStudent = { id: string; name: string; rollNumber: string; participantId: string | null };

/** The single implicit host-school record participants attach to.
 *  ponytail: one hard-coded host school; make it configurable if the platform
 *  ever runs for more than one host (out of scope per PRD §1.4). */
export async function hostSchoolId(): Promise<string> {
  const NAME = "Host School";
  const CITY = "—";
  const [existing] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(and(eq(schools.name, NAME), eq(schools.city, CITY)));
  if (existing) return existing.id;
  const [created] = await db
    .insert(schools)
    .values({ name: NAME, city: CITY })
    .onConflictDoNothing()
    .returning({ id: schools.id });
  if (created) return created.id;
  const [row] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(and(eq(schools.name, NAME), eq(schools.city, CITY)));
  return row.id;
}

// Brute-force guard on roll+CNIC (NFR-4). ponytail: in-memory, per-instance —
// move to a DB/Redis counter if deployed multi-instance.
const attempts = new Map<string, { n: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW = 15 * 60 * 1000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { n: 1, resetAt: now + WINDOW });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_ATTEMPTS;
}

/** Look up by roll+CNIC and start a host session. Returns false on bad creds / lockout. */
export async function hostLogin(rollNumber: string, cnic: string): Promise<boolean> {
  const key = rollNumber.trim().toLowerCase();
  if (rateLimited(key)) return false;

  const [student] = await db
    .select({ id: hostStudents.id })
    .from(hostStudents)
    .where(and(eq(hostStudents.rollNumber, rollNumber.trim()), eq(hostStudents.cnic, cnic.trim())));
  if (!student) return false;

  const token = randomBytes(32).toString("hex");
  await db.insert(hostSessions).values({
    token,
    hostStudentId: student.id,
    expiresAt: new Date(Date.now() + MAX_AGE * 1000),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return true;
}

export async function getHostStudent(): Promise<HostStudent | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: hostStudents.id,
      name: hostStudents.name,
      rollNumber: hostStudents.rollNumber,
      participantId: hostStudents.participantId,
    })
    .from(hostSessions)
    .innerJoin(hostStudents, eq(hostStudents.id, hostSessions.hostStudentId))
    .where(and(eq(hostSessions.token, token), gt(hostSessions.expiresAt, new Date())));
  return row ?? null;
}

export async function requireHostStudent(): Promise<HostStudent> {
  const s = await getHostStudent();
  if (!s) redirect("/student/login");
  return s;
}

export async function destroyHostSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(hostSessions).where(eq(hostSessions.token, token));
  store.delete(COOKIE);
}
