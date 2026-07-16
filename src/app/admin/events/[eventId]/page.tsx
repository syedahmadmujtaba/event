import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, activities } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { createActivity, deleteActivity } from "@/lib/event-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EventActivitiesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requirePermission("event.manage");
  const { eventId } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) notFound();

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.eventId, eventId))
    .orderBy(activities.createdAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Activities for this event.</p>
      </div>

      <div className="space-y-2">
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.name}</span>
                <Badge tone={a.kind === "competitive" ? "brand" : "neutral"}>
                  {a.kind === "competitive" ? "Competitive" : "Non-competitive"}
                </Badge>
                {a.teamBased && <Badge tone="info">Team-based</Badge>}
              </div>
              <form action={deleteActivity}>
                <input type="hidden" name="activityId" value={a.id} />
                <input type="hidden" name="eventId" value={eventId} />
                <Button size="icon" variant="ghost" title="Delete">
                  <Trash2 />
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No activities yet.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createActivity} className="space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="100m Sprint / Gala" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kind">Kind</Label>
                <select
                  id="kind"
                  name="kind"
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:border-primary"
                >
                  <option value="competitive">Competitive</option>
                  <option value="noncompetitive">Non-competitive</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="teamBased" className="size-4 accent-[var(--primary)]" />
              Team-based (coordinators form teams)
            </label>
            <Button>Add activity</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
