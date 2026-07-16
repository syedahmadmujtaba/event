import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { delegationRegistrations, schools, events, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { approveDelegation, rejectDelegation } from "@/lib/delegation-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DelegationsPage() {
  await requirePermission("delegation.approve");

  // Pending queue — only email-verified coordinators (gate 1 before gate 2).
  const pending = await db
    .select({
      id: delegationRegistrations.id,
      school: schools.name,
      city: schools.city,
      event: events.name,
      coordinator: users.name,
      email: users.email,
    })
    .from(delegationRegistrations)
    .innerJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
    .innerJoin(events, eq(events.id, delegationRegistrations.eventId))
    .innerJoin(users, eq(users.id, delegationRegistrations.coordinatorUserId))
    .where(
      and(
        eq(delegationRegistrations.status, "pending"),
        isNotNull(users.emailVerifiedAt),
      ),
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delegations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email-verified delegations awaiting approval.
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to review.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle>{d.school}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {d.city} · {d.event} · {d.coordinator} ({d.email})
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <form action={approveDelegation}>
                  <input type="hidden" name="registrationId" value={d.id} />
                  <Button size="sm">Approve</Button>
                </form>
                <form action={rejectDelegation} className="flex items-end gap-2">
                  <input type="hidden" name="registrationId" value={d.id} />
                  <Input
                    name="reason"
                    placeholder="Reason (optional)"
                    className="h-8 w-56"
                  />
                  <Button size="sm" variant="danger">
                    Reject
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
