"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, userRoles } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, userCount, getCurrentUser, homePath } from "./auth";
import { ALL_PERMISSIONS } from "./permissions";

export type AuthState = { error?: string };

/** First-run bootstrap: creates the Super Admin role + first user. No-op if users exist. */
export async function createFirstAdmin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if ((await userCount()) > 0) return { error: "Setup has already been completed." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 8) {
    return { error: "Enter a name, email, and a password of at least 8 characters." };
  }

  const [role] = await db
    .insert(roles)
    .values({
      name: "Super Admin",
      description: "Full access to everything.",
      permissions: [...ALL_PERMISSIONS],
      isSystem: true,
    })
    .returning({ id: roles.id });

  // Seed the coordinator role too — approveDelegation grants it by name.
  await db.insert(roles).values({
    name: "Delegation Coordinator",
    description: "Represents a visiting school for one event.",
    permissions: ["delegation.self"],
    isSystem: true,
  });

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .returning({ id: users.id });

  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  await createSession(user.id);
  redirect("/admin");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Verify even when the user is missing to keep timing uniform.
  const ok = await verifyPassword(
    password,
    user?.passwordHash ?? "x:0000000000000000000000000000000000000000000000000000000000000000",
  );
  if (!user || !ok) return { error: "Incorrect email or password." };

  await createSession(user.id);
  const current = await getCurrentUser();
  redirect(current ? homePath(current) : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
