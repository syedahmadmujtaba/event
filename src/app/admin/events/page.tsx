import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { setEventStatus } from "@/lib/event-actions";
import { hasEnded } from "@/lib/event";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { NewEventDialog } from "@/components/admin/new-event-dialog";
import { EditEventDialog } from "@/components/admin/edit-event-dialog";
import { DeleteEventButton } from "@/components/admin/delete-event-button";

const NEXT: Record<string, { to: string; label: string }> = {
  draft: { to: "open", label: "Open for registration" },
  open: { to: "closed", label: "Close" },
  closed: { to: "open", label: "Reopen" },
};

const TABS = [
  { status: undefined, label: "All" },
  { status: "open", label: "Open" },
  { status: "closed", label: "Closed" },
  { status: "draft", label: "Draft" },
];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("event.manage");
  const { status } = await searchParams;
  const tab = TABS.some((t) => t.status === status) ? status : undefined;

  // Self-heal: an event left "open" past its end date is no longer offered for
  // registration (see openEventsFor) — flip its stored status to match reality.
  const today = new Date().toISOString().slice(0, 10);
  await db
    .update(events)
    .set({ status: "closed" })
    .where(
      and(
        eq(events.status, "open"),
        sql`${events.endDate} is not null and ${events.endDate} < ${today}`,
      ),
    );

  const rows = tab
    ? await db.select().from(events).where(eq(events.status, tab)).orderBy(events.createdAt)
    : await db.select().from(events).orderBy(events.createdAt);

  const counts = await db
    .select({ status: events.status, n: sql<number>`count(*)::int` })
    .from(events)
    .groupBy(events.status);
  const byStatus = new Map(counts.map((c) => [c.status, c.n]));
  const total = [...byStatus.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only events set to “open” appear in delegation registration.
          </p>
        </div>
        <NewEventDialog />
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => {
          const active = tab === t.status;
          return (
            <Link
              key={t.label}
              href={t.status ? `/admin/events?status=${t.status}` : "/admin/events"}
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

      <div className="space-y-3">
        {rows.map((e) => {
          const ended = hasEnded(e.endDate);
          // Past end date: block (re)opening; only allow closing an open one.
          const next = ended && NEXT[e.status]?.to === "open" ? undefined : NEXT[e.status];
          return (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between pt-5">
                <div>
                  <Link
                    href={`/admin/events/${e.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {e.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {e.type ?? "—"}
                    {e.startDate ? ` · ${e.startDate}` : ""}
                    {e.endDate ? ` – ${e.endDate}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  {ended && (
                    <span className="text-xs font-medium text-muted-foreground">Ended</span>
                  )}
                  {next && (
                    <form action={setEventStatus}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <input type="hidden" name="status" value={next.to} />
                      <Button size="sm" variant="outline">
                        {next.label}
                      </Button>
                    </form>
                  )}
                  <EditEventDialog
                    event={{
                      id: e.id,
                      name: e.name,
                      type: e.type,
                      startDate: e.startDate,
                      endDate: e.endDate,
                      status: e.status,
                      registerableBy: e.registerableBy ?? [],
                      maxActivitiesPerParticipant: e.maxActivitiesPerParticipant,
                    }}
                  />
                  <DeleteEventButton eventId={e.id} name={e.name} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        )}
      </div>
    </div>
  );
}
