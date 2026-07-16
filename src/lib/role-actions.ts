"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { requirePermission } from "./auth";
import { ALL_PERMISSIONS } from "./permissions";

const VALID = new Set<string>(ALL_PERMISSIONS);

function readPermissions(formData: FormData): string[] {
  return formData
    .getAll("permissions")
    .map(String)
    .filter((p) => VALID.has(p));
}

export async function createRole(formData: FormData) {
  await requirePermission("role.manage");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(roles).values({
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    permissions: readPermissions(formData),
  });
  revalidatePath("/admin/settings");
}

export async function updateRolePermissions(formData: FormData) {
  await requirePermission("role.manage");
  const id = String(formData.get("roleId") ?? "");
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (!role || role.isSystem) return; // system roles are locked
  await db
    .update(roles)
    .set({ permissions: readPermissions(formData) })
    .where(eq(roles.id, id));
  revalidatePath("/admin/settings");
}

export async function deleteRole(formData: FormData) {
  await requirePermission("role.manage");
  const id = String(formData.get("roleId") ?? "");
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (!role || role.isSystem) return;
  await db.delete(roles).where(eq(roles.id, id));
  revalidatePath("/admin/settings");
}
