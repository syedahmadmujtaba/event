import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, activities, eventFeeRules } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import {
  createActivity,
  deleteActivity,
  setActivityCap,
  createFeeRule,
  deleteFeeRule,
} from "@/lib/event-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

const PAYER_LABELS: Record<string, string> = {
  host_student: "Host student",
  delegation_student: "Delegation student",
  delegation_registration: "Delegation registration",
  visitor: "Visitor",
};

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

  const [rows, feeRules] = await Promise.all([
    db.select().from(activities).where(eq(activities.eventId, eventId)).orderBy(activities.createdAt),
    db.select().from(eventFeeRules).where(eq(eventFeeRules.eventId, eventId)).orderBy(eventFeeRules.payerType),
  ]);

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

      <Card>
        <CardHeader>
          <CardTitle>Registration limit</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setActivityCap} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-1.5">
              <Label htmlFor="cap">Max activities per participant</Label>
              <Input
                id="cap"
                name="cap"
                type="number"
                min={1}
                defaultValue={event.maxActivitiesPerParticipant ?? ""}
                placeholder="No limit"
                className="w-40"
              />
            </div>
            <Button size="sm" variant="outline">
              Save
            </Button>
            <span className="text-xs text-muted-foreground">Leave blank for no limit.</span>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {feeRules.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
              <span>
                {PAYER_LABELS[f.payerType] ?? f.payerType} ·{" "}
                <span className="font-medium">Rs {f.amount.toLocaleString()}</span>
                {f.day > 0 && <span className="text-muted-foreground"> · day {f.day}</span>}
              </span>
              <form action={deleteFeeRule}>
                <input type="hidden" name="ruleId" value={f.id} />
                <input type="hidden" name="eventId" value={eventId} />
                <Button size="icon" variant="ghost" title="Delete">
                  <Trash2 />
                </Button>
              </form>
            </div>
          ))}
          {feeRules.length === 0 && (
            <p className="text-sm text-muted-foreground">No fee rules yet.</p>
          )}
          <form action={createFeeRule} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-1.5">
              <Label htmlFor="payerType">Payer</Label>
              <select
                id="payerType"
                name="payerType"
                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
              >
                {Object.entries(PAYER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (Rs)</Label>
              <Input id="amount" name="amount" type="number" min={0} required className="w-32" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="day">Day</Label>
              <Input id="day" name="day" type="number" min={0} defaultValue={0} className="w-20" />
            </div>
            <Button size="sm">Add / update</Button>
          </form>
          <p className="text-xs text-muted-foreground">Day 0 = flat event fee; 1, 2… for per-day fees.</p>
        </CardContent>
      </Card>
    </div>
  );
}
