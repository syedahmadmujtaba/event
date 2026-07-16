import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, userRoles, roles } from "@/db/schema";
import type { Permission } from "./permissions";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  permissions: Set<Permission>;
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  store.delete(COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
  if (!row) return null;

  // Union permissions across all the user's roles (global + event-scoped).
  const roleRows = await db
    .select({ permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, row.id));

  const permissions = new Set<Permission>();
  for (const r of roleRows) {
    for (const p of r.permissions) permissions.add(p as Permission);
  }

  return { ...row, permissions };
}

export function can(user: CurrentUser, permission: Permission) {
  return user.permissions.has(permission);
}

// Any permission other than the coordinator's own-delegation one grants admin access.
export function isAdmin(user: CurrentUser) {
  for (const p of user.permissions) if (p !== "delegation.self") return true;
  return false;
}

/** Where a user lands after login / when hitting the wrong area. */
export function homePath(user: CurrentUser) {
  return isAdmin(user) ? "/admin" : "/delegation";
}

/** Redirects to /login when unauthenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects unauthenticated → /login, or unauthorized → /admin. */
export async function requirePermission(
  permission: Permission,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/admin");
  return user;
}

export async function userCount(): Promise<number> {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length;
}
