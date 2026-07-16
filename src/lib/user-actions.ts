"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, userRoles } from "@/db/schema";
import { hashPassword } from "./password";
import { requirePermission } from "./auth";

/** Create a staff account (Event Admin, Verifier, …). Admin-created → pre-verified. */
export async function createStaffUser(formData: FormData) {
  await requirePermission("user.manage");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 8) return;

  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (dup) return;

  await db.insert(users).values({
    name,
    email,
    passwordHash: await hashPassword(password),
    emailVerifiedAt: new Date(),
  });
  revalidatePath("/admin/users");
}

/** Assign a role to a user, global (no eventId) or scoped to one event (FR-29). */
export async function assignRole(formData: FormData) {
  await requirePermission("user.manage");
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const eventId = String(formData.get("eventId") ?? "") || null;
  if (!userId || !roleId) return;

  // Unique constraint ignores NULL eventId, so guard duplicates ourselves.
  const existing = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eventId ? eq(userRoles.eventId, eventId) : sql`${userRoles.eventId} is null`,
      ),
    );
  if (existing.length) return;

  await db.insert(userRoles).values({ userId, roleId, eventId });
  revalidatePath("/admin/users");
}

export async function removeRole(formData: FormData) {
  await requirePermission("user.manage");
  const id = String(formData.get("userRoleId") ?? "");
  if (!id) return;

  // Lockout guard: never delete the last assignment that grants role.manage.
  const [target] = await db
    .select({ permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.id, id));
  if (target?.permissions.includes("role.manage")) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(sql`${roles.permissions} ? 'role.manage'`);
    if (n <= 1) return; // would lock everyone out
  }

  await db.delete(userRoles).where(eq(userRoles.id, id));
  revalidatePath("/admin/users");
}
