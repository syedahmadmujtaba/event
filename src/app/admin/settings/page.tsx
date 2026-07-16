import { Lock, Trash2 } from "lucide-react";
import { db } from "@/db";
import { roles as rolesTable } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions";
import { createRole, updateRolePermissions, deleteRole } from "@/lib/role-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function PermissionChecklist({ selected }: { selected: Set<string> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ALL_PERMISSIONS.map((p) => (
        <label
          key={p}
          className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-tint"
        >
          <input
            type="checkbox"
            name="permissions"
            value={p}
            defaultChecked={selected.has(p)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span>
            <span className="font-medium">{p}</span>
            <span className="block text-xs text-muted-foreground">
              {PERMISSIONS[p]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default async function RolesSettingsPage() {
  await requirePermission("role.manage");
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.createdAt);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure what each role can do. Assign roles to users from the Users
          area.
        </p>
      </div>

      <div className="space-y-4">
        {roles.map((role) => {
          const selected = new Set(role.permissions);
          return (
            <Card key={role.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <Badge tone="brand">
                        <Lock className="size-3" /> System
                      </Badge>
                    )}
                  </CardTitle>
                  {role.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
                {!role.isSystem && (
                  <form action={deleteRole}>
                    <input type="hidden" name="roleId" value={role.id} />
                    <Button size="icon" variant="ghost" title="Delete role">
                      <Trash2 />
                    </Button>
                  </form>
                )}
              </CardHeader>
              <CardContent>
                {role.isSystem ? (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </div>
                ) : (
                  <form action={updateRolePermissions} className="space-y-4">
                    <input type="hidden" name="roleId" value={role.id} />
                    <PermissionChecklist selected={selected} />
                    <Button size="sm">Save permissions</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New role</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRole} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="e.g. Verifier" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Optional" />
              </div>
            </div>
            <PermissionChecklist selected={new Set()} />
            <Button>Create role</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
