import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
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

// cache() memoizes within one request, so the layout + page that both call
// auth share a single lookup instead of doubling the DB round trips.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  // One round trip: session + user + union of permission strings across roles
  // (lateral flattens each role's jsonb permission array).
  const result = await db.execute(sql`
    select u.id, u.email, u.name,
      coalesce(array_agg(p.p) filter (where p.p is not null), '{}'::text[]) as permissions
    from sessions s
    join users u on u.id = s.user_id
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    left join lateral jsonb_array_elements_text(r.permissions) as p(p) on true
    where s.token = ${token} and s.expires_at > now()
    group by u.id, u.email, u.name
  `);
  const row = result.rows[0] as
    | { id: string; email: string; name: string; permissions: string[] }
    | undefined;
  if (!row) return null;

  const permissions = new Set<Permission>();
  for (const p of row.permissions) permissions.add(p as Permission);
  return { id: row.id, email: row.email, name: row.name, permissions };
});

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
