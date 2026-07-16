import { and, desc, eq, inArray } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { db } from "@/db";
import {
  events,
  activities,
  registrations,
  payments,
  credentials,
  eventFeeRules,
} from "@/db/schema";
import { requireHostStudent } from "@/lib/host-auth";
import { hostLogout, hostRegisterActivity, hostSubmitPayment } from "@/lib/host-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const student = await requireHostStudent();
  const pid = student.participantId;

  const openEvents = await db.select().from(events).where(eq(events.status, "open"));
  const acts = openEvents.length
    ? await db
        .select()
        .from(activities)
        .where(inArray(activities.eventId, openEvents.map((e) => e.id)))
    : [];

  // The student's own registrations / payments / credentials (only if they have a participant row).
  const [regs, pays, creds, feeRules] = pid
    ? await Promise.all([
        db
          .select({ activityId: registrations.activityId, status: registrations.status })
          .from(registrations)
          .where(eq(registrations.participantId, pid)),
        db
          .select()
          .from(payments)
          .where(and(eq(payments.payerType, "participant"), eq(payments.payerId, pid)))
          .orderBy(desc(payments.createdAt)),
        db
          .select()
          .from(credentials)
          .where(and(eq(credentials.holderType, "participant"), eq(credentials.holderId, pid))),
        openEvents.length
          ? db.select().from(eventFeeRules).where(inArray(eventFeeRules.eventId, openEvents.map((e) => e.id)))
          : Promise.resolve([]),
      ])
    : [[], [], [], []];

  const regStatus = new Map(regs.map((r) => [r.activityId, r.status]));
  const latestPayByEvent = new Map<string, (typeof pays)[number]>();
  for (const p of pays) if (p.eventId && !latestPayByEvent.has(p.eventId)) latestPayByEvent.set(p.eventId, p);

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
            E
          </span>
          <span className="font-display text-lg font-bold">Eventide</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{student.name}</p>
            <p className="text-xs text-muted-foreground">Roll {student.rollNumber}</p>
          </div>
          <form action={hostLogout}>
            <button
              type="submit"
              title="Sign out"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">Open events</h1>
        {openEvents.length === 0 && (
          <p className="text-sm text-muted-foreground">No events are open right now.</p>
        )}

        {openEvents.map((ev) => {
          const evActs = acts.filter((a) => a.eventId === ev.id);
          const evRegged = evActs.some((a) => regStatus.has(a.id));
          const pay = latestPayByEvent.get(ev.id);
          const evFees = feeRules.filter((f) => f.eventId === ev.id && f.payerType === "host_student");
          const evCreds = creds.filter((c) => c.eventId === ev.id);

          return (
            <Card key={ev.id}>
              <CardHeader>
                <CardTitle>{ev.name}</CardTitle>
                {ev.type && <p className="text-sm text-muted-foreground">{ev.type}</p>}
              </CardHeader>
              <CardContent className="space-y-5">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Activities</h3>
                  {evActs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No activities yet.</p>
                  )}
                  {evActs.map((a) => {
                    const st = regStatus.get(a.id);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm"
                      >
                        <span>{a.name}</span>
                        {st ? (
                          <StatusBadge status={st} />
                        ) : (
                          <form action={hostRegisterActivity}>
                            <input type="hidden" name="activityId" value={a.id} />
                            <Button size="sm" variant="outline">
                              Register
                            </Button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </section>

                {evRegged && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">Payment</h3>
                    {evFees.map((f) => (
                      <Badge key={f.id} tone="neutral">
                        Fee: Rs {f.amount.toLocaleString()}
                        {f.day > 0 ? ` (day ${f.day})` : ""}
                      </Badge>
                    ))}
                    {pay && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Latest slip:</span>
                        <StatusBadge status={pay.status} />
                        {pay.status === "rejected" && pay.rejectionReason && (
                          <span className="text-muted-foreground">— {pay.rejectionReason}</span>
                        )}
                      </div>
                    )}
                    {pay?.status !== "submitted" && pay?.status !== "approved" && (
                      <form action={hostSubmitPayment} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="eventId" value={ev.id} />
                        <input
                          type="file"
                          name="slip"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          required
                          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                        />
                        <Button size="sm">Upload slip</Button>
                      </form>
                    )}
                  </section>
                )}

                {evCreds.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">Your card</h3>
                    <div className="flex flex-wrap gap-2">
                      {evCreds.map((c) => (
                        <a
                          key={c.qrToken}
                          href={`/credential/${c.qrToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-sm hover:border-primary hover:text-primary"
                        >
                          View credential
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
