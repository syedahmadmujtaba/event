import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  delegationRegistrations,
  users,
  payments,
  registrations,
  credentials,
  schools,
  events,
} from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Users, ReceiptText, UserCheck, IdCard } from "lucide-react";

export const dynamic = "force-dynamic";

const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;

export default async function AdminDashboard() {
  const N = sql<number>`count(*)::int`;

  const [pendingApprovals, paymentsToVerify, participants, credsIssued] = await Promise.all([
    count(
      db
        .select({ n: N })
        .from(delegationRegistrations)
        .innerJoin(users, eq(users.id, delegationRegistrations.coordinatorUserId))
        .where(and(eq(delegationRegistrations.status, "pending"), isNotNull(users.emailVerifiedAt))),
    ),
    count(db.select({ n: N }).from(payments).where(eq(payments.status, "submitted"))),
    count(db.select({ n: sql<number>`count(distinct ${registrations.participantId})::int` }).from(registrations)),
    count(db.select({ n: N }).from(credentials)),
  ]);

  // A small "needs attention" queue: pending delegations + submitted payments.
  const [pendingDelegs, submittedPays] = await Promise.all([
    db
      .select({ name: schools.name, event: events.name })
      .from(delegationRegistrations)
      .innerJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
      .innerJoin(events, eq(events.id, delegationRegistrations.eventId))
      .innerJoin(users, eq(users.id, delegationRegistrations.coordinatorUserId))
      .where(and(eq(delegationRegistrations.status, "pending"), isNotNull(users.emailVerifiedAt)))
      .limit(5),
    db.select({ id: payments.id }).from(payments).where(eq(payments.status, "submitted")).limit(5),
  ]);

  const STATS = [
    { label: "Pending approvals", value: pendingApprovals, icon: Users, tone: "pending" as const },
    { label: "Payments to verify", value: paymentsToVerify, icon: ReceiptText, tone: "info" as const },
    { label: "Registered participants", value: participants, icon: UserCheck, tone: "brand" as const },
    { label: "Credentials issued", value: credsIssued, icon: IdCard, tone: "verified" as const },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge tone={tone}>
                  <Icon className="size-3.5" />
                </Badge>
              </div>
              <p className="mt-3 font-display text-3xl font-bold tracking-tight">
                {value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Needs your attention</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDelegs.length === 0 && submittedPays.length === 0 ? (
            <p className="text-sm text-muted-foreground">All clear.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pendingDelegs.map((d, i) => (
                <li key={`d${i}`} className="flex items-center justify-between py-3 first:pt-0">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.event} · Delegation</p>
                  </div>
                  <StatusBadge status="pending" />
                </li>
              ))}
              {submittedPays.length > 0 && (
                <li className="flex items-center justify-between py-3">
                  <p className="text-sm font-medium">{submittedPays.length} payment slip(s) to verify</p>
                  <StatusBadge status="submitted" />
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
