import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, userRoles, events } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { createStaffUser, assignRole, removeRole } from "@/lib/user-actions";
import { importHostStudents } from "@/lib/host-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission("user.manage");

  const [allUsers, allRoles, allEvents, assignments] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
    db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(roles.name),
    db.select({ id: events.id, name: events.name }).from(events).orderBy(events.name),
    db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        role: roles.name,
        event: events.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(events, eq(events.id, userRoles.eventId)),
  ]);

  const byUser = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users & roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign roles to people, globally or scoped to a single event.
        </p>
      </div>

      <div className="space-y-3">
        {allUsers.map((u) => {
          const mine = byUser.get(u.id) ?? [];
          return (
            <Card key={u.id}>
              <CardHeader>
                <CardTitle className="text-base">{u.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {mine.length === 0 && (
                    <span className="text-sm text-muted-foreground">No roles yet</span>
                  )}
                  {mine.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1">
                      <Badge tone="brand">
                        {a.role}
                        <span className="text-primary/70">
                          · {a.event ?? "Global"}
                        </span>
                      </Badge>
                      <form action={removeRole}>
                        <input type="hidden" name="userRoleId" value={a.id} />
                        <button
                          type="submit"
                          title="Remove role"
                          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-surface-muted hover:text-status-rejected"
                        >
                          <X className="size-3.5" />
                        </button>
                      </form>
                    </span>
                  ))}
                </div>

                <form action={assignRole} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select
                    name="roleId"
                    required
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                  >
                    {allRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="eventId"
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                  >
                    <option value="">Global</option>
                    {allEvents.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline">
                    Assign
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add staff user</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStaffUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Temp password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
            </div>
            <Button>Create user</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import host students</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importHostStudents} className="space-y-3">
            <textarea
              name="csv"
              rows={5}
              required
              placeholder={"rollNumber,cnic,name,class\n22-118,3520212345671,Ali Raza,10-B"}
              className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-sm outline-none focus-visible:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              One student per line: <code>rollNumber,cnic,name,class</code>. Existing roll numbers are updated.
            </p>
            <Button>Import</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
