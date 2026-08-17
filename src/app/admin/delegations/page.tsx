import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { delegationRegistrations, schools, events, users, payments } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { approveDelegation, rejectDelegation } from "@/lib/delegation-actions";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const TABS = [
  { status: undefined, label: "All" },
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

export default async function DelegationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("delegation.approve");
  const { status } = await searchParams;
  const tab = TABS.some((t) => t.status === status) ? status : undefined;

  const rows = await db
    .select({
      id: delegationRegistrations.id,
      status: delegationRegistrations.status,
      rejectionReason: delegationRegistrations.rejectionReason,
      school: schools.name,
      city: schools.city,
      event: events.name,
      coordinator: users.name,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(delegationRegistrations)
    .innerJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
    .innerJoin(events, eq(events.id, delegationRegistrations.eventId))
    .innerJoin(users, eq(users.id, delegationRegistrations.coordinatorUserId))
    .where(tab ? eq(delegationRegistrations.status, tab) : undefined)
    .orderBy(desc(delegationRegistrations.createdAt));

  // Slips — latest submission per registration.
  const ids = rows.map((r) => r.id);
  const payRows = ids.length
    ? await db
        .select()
        .from(payments)
        .where(and(eq(payments.payerType, "delegation_registration"), inArray(payments.payerId, ids)))
        .orderBy(desc(payments.createdAt))
    : [];
  const payByReg = new Map<string, (typeof payRows)[number]>();
  for (const p of payRows) if (!payByReg.has(p.payerId)) payByReg.set(p.payerId, p);

  const counts = await db
    .select({ status: delegationRegistrations.status, n: sql<number>`count(*)::int` })
    .from(delegationRegistrations)
    .groupBy(delegationRegistrations.status);
  const byStatus = new Map(counts.map((c) => [c.status, c.n]));
  const total = [...byStatus.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delegations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          School delegations across all events.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.status;
          return (
            <Link
              key={t.label}
              href={t.status ? `/admin/delegations?status=${t.status}` : "/admin/delegations"}
              role="tab"
              aria-selected={active}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  active
                    ? "bg-primary-tint text-primary"
                    : "bg-surface-muted text-muted-foreground",
                )}
              >
                {t.status ? (byStatus.get(t.status) ?? 0) : total}
              </span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No delegations yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((d) => {
            const pay = payByReg.get(d.id);
            const verified = d.emailVerifiedAt !== null;
            return (
              <Card key={d.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{d.school}</CardTitle>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {d.city} · {d.event} · {d.coordinator} ({d.email})
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {pay ? (
                        <Badge tone="info">
                          <FileText className="size-3.5" /> Fee slip submitted
                        </Badge>
                      ) : (
                        <Badge tone="neutral">No fee slip yet</Badge>
                      )}
                      {!verified && (
                        <Badge tone="pending">Email not verified</Badge>
                      )}
                    </div>
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

                  {d.status === "pending" ? (
                    <div className="flex flex-wrap items-end gap-3">
                      {verified && pay ? (
                        <form action={approveDelegation}>
                          <input type="hidden" name="registrationId" value={d.id} />
                          <Button size="sm">Approve</Button>
                        </form>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Approval needs the coordinator&apos;s email verified and a fee slip uploaded.
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
                  ) : d.status === "rejected" ? (
                    <p className="text-xs text-muted-foreground">
                      {d.rejectionReason
                        ? `Rejected: ${d.rejectionReason}`
                        : "Rejected by admin."}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
