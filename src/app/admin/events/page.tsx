import Link from "next/link";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { createEvent, setEventStatus, hasEnded } from "@/lib/event-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

const NEXT: Record<string, { to: string; label: string }> = {
  draft: { to: "open", label: "Open for registration" },
  open: { to: "closed", label: "Close" },
  closed: { to: "open", label: "Reopen" },
};

export default async function EventsPage() {
  await requirePermission("event.manage");
  const rows = await db.select().from(events).orderBy(events.createdAt);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only events set to “open” appear in delegation registration.
        </p>
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
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New event</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Spring Sports Meet 2026" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Input id="type" name="type" placeholder="Sports / Gala / …" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>
            <Button>Create event</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
