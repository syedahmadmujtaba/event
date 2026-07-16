import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, delegationRegistrations, schools, events, participants } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { approvePayment, rejectPayment } from "@/lib/payment-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requirePermission("payment.verify");

  // Submitted payments awaiting verification, across payer types.
  const [delegationRows, participantRows] = await Promise.all([
    db
      .select({ id: payments.id, createdAt: payments.createdAt, who: schools.name, event: events.name })
      .from(payments)
      .innerJoin(delegationRegistrations, eq(delegationRegistrations.id, payments.payerId))
      .innerJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
      .innerJoin(events, eq(events.id, delegationRegistrations.eventId))
      .where(and(eq(payments.status, "submitted"), eq(payments.payerType, "delegation_registration"))),
    db
      .select({ id: payments.id, createdAt: payments.createdAt, who: participants.name, event: events.name })
      .from(payments)
      .innerJoin(participants, eq(participants.id, payments.payerId))
      .innerJoin(events, eq(events.id, payments.eventId))
      .where(and(eq(payments.status, "submitted"), eq(payments.payerType, "participant"))),
  ]);
  const rows = [...delegationRows, ...participantRows];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verify submitted payment slips.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to verify.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{p.who}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {p.event} · submitted {p.createdAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <a
                  href={`/admin/payments/${p.id}/slip`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="size-4" /> View slip
                </a>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <form action={approvePayment}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <Button size="sm">Approve</Button>
                </form>
                <form action={rejectPayment} className="flex items-end gap-2">
                  <input type="hidden" name="paymentId" value={p.id} />
                  <Input name="reason" placeholder="Reason (optional)" className="h-8 w-56" />
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
