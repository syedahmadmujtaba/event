import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { Input, Label } from "@/components/ui/input";
import { registerVisitor } from "@/lib/visitor-actions";

export const dynamic = "force-dynamic";

export default async function VisitorRegisterPage() {
  const openEvents = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.status, "open"));

  return (
    <AuthShell title="Visitor entry" subtitle="Register to attend, then upload your payment slip.">
      {openEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events are open for entry right now.</p>
      ) : (
        <AuthForm action={registerVisitor} submitLabel="Register">
          <div className="space-y-1.5">
            <Label htmlFor="event">Event</Label>
            <select
              id="event"
              name="eventId"
              required
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:border-primary"
            >
              {openEvents.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnic">CNIC</Label>
            <Input id="cnic" name="cnic" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="association">Attending with</Label>
            <Input id="association" name="association" placeholder="Student / delegation you're visiting" />
          </div>
        </AuthForm>
      )}
    </AuthShell>
  );
}
