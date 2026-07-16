import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, activities, matches } from "@/db/schema";
import { sideNameMap } from "@/lib/match-queries";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  const acts = await db.select({ id: activities.id, name: activities.name }).from(activities).where(eq(activities.eventId, eventId));
  const actName = new Map(acts.map((a) => [a.id, a.name]));
  const rows = acts.length
    ? await db.select().from(matches).where(inArray(matches.activityId, acts.map((a) => a.id)))
    : [];
  const names = await sideNameMap(rows);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Match schedule &amp; results</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {names.get(m.sideAId) ?? "?"} vs {names.get(m.sideBId) ?? "?"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {actName.get(m.activityId)}
                    {m.venue ? ` · ${m.venue}` : ""}
                    {m.scheduledAt ? ` · ${m.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}` : ""}
                    {m.status === "completed" && m.result ? ` · ${m.result}` : ""}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
