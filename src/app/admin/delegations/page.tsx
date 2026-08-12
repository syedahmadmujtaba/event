import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { delegationRegistrations, schools, events, users, payments } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { approveDelegation, rejectDelegation } from "@/lib/delegation-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

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

  // Slips for the pending queue — latest submission per registration.
  const pendingIds = pending.map((p) => p.id);
  const payRows = pendingIds.length
    ? await db
        .select()
        .from(payments)
        .where(and(eq(payments.payerType, "delegation_registration"), inArray(payments.payerId, pendingIds)))
        .orderBy(desc(payments.createdAt))
    : [];
  const payByReg = new Map<string, (typeof payRows)[number]>();
  for (const p of payRows) if (!payByReg.has(p.payerId)) payByReg.set(p.payerId, p);

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
          {pending.map((d) => {
            const pay = payByReg.get(d.id);
            return (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle>{d.school}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {d.city} · {d.event} · {d.coordinator} ({d.email})
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    {pay ? (
                      <Badge tone="info">
                        <FileText className="size-3.5" /> Fee slip submitted
                      </Badge>
                    ) : (
                      <Badge tone="neutral">No fee slip yet</Badge>
                    )}
                    {pay && (
                      <a
                        href={`/admin/payments/${pay.id}/slip`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <FileText className="size-4" /> View slip
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    {pay ? (
                      <form action={approveDelegation}>
                        <input type="hidden" name="registrationId" value={d.id} />
                        <Button size="sm">Approve</Button>
                      </form>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Approval is available once the coordinator uploads the fee slip.
                      </p>
                    )}
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
