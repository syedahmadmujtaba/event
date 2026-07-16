import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { Input, Label } from "@/components/ui/input";
import { registerDelegation } from "@/lib/delegation-actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const openEvents = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(eq(events.status, "open"));

  return (
    <AuthShell
      title="Register your delegation"
      subtitle="Sign up your school for an event. We'll email you to confirm, then an admin reviews it."
    >
      {openEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events are open for registration right now. Please check back later.
        </p>
      ) : (
        <AuthForm action={registerDelegation} submitLabel="Register delegation">
          <div className="space-y-1.5">
            <Label htmlFor="event">Event</Label>
            <select
              id="event"
              name="eventId"
              required
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {openEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="schoolName">School name</Label>
              <Input id="schoolName" name="schoolName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name (coordinator)</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </AuthForm>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
