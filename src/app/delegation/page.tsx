import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  delegationRegistrations,
  schools,
  events,
  participants,
  activities,
  registrations,
  teams,
  teamMembers,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  addParticipant,
  registerParticipant,
  createTeam,
  addTeamMember,
} from "@/lib/coordinator-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function loadBundle(regId: string, schoolId: string, eventId: string) {
  const [parts, acts] = await Promise.all([
    db.select().from(participants).where(eq(participants.schoolId, schoolId)),
    db.select().from(activities).where(eq(activities.eventId, eventId)),
  ]);
  const partIds = parts.map((p) => p.id);
  const regRows = partIds.length
    ? await db
        .select({
          participantId: registrations.participantId,
          activityId: registrations.activityId,
          status: registrations.status,
        })
        .from(registrations)
        .where(inArray(registrations.participantId, partIds))
    : [];
  // Teams are per-school; every team of this school for this event's activities.
  const actIds = acts.map((a) => a.id);
  const teamRows = actIds.length
    ? await db
        .select()
        .from(teams)
        .where(and(eq(teams.schoolId, schoolId), inArray(teams.activityId, actIds)))
    : [];
  const memberRows = teamRows.length
    ? await db
        .select({ teamId: teamMembers.teamId, name: participants.name })
        .from(teamMembers)
        .innerJoin(participants, eq(participants.id, teamMembers.participantId))
        .where(inArray(teamMembers.teamId, teamRows.map((t) => t.id)))
    : [];
  return { regId, parts, acts, regRows, teamRows, memberRows };
}

export default async function DelegationPage() {
  const user = await requireUser();

  const regs = await db
    .select({
      id: delegationRegistrations.id,
      status: delegationRegistrations.status,
      reason: delegationRegistrations.rejectionReason,
      schoolId: delegationRegistrations.schoolId,
      eventId: delegationRegistrations.eventId,
      school: schools.name,
      event: events.name,
    })
    .from(delegationRegistrations)
    .innerJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
    .innerJoin(events, eq(events.id, delegationRegistrations.eventId))
    .where(eq(delegationRegistrations.coordinatorUserId, user.id));

  const bundles = new Map(
    await Promise.all(
      regs
        .filter((r) => r.status === "approved")
        .map(async (r) => [r.id, await loadBundle(r.id, r.schoolId, r.eventId)] as const),
    ),
  );

  if (regs.length === 0) {
    return (
      <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
        You have no delegation registrations.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Your delegation</h1>

      {regs.map((r) => {
        if (r.status !== "approved") {
          return (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{r.school}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.event}
                    {r.status === "rejected" && r.reason ? ` — ${r.reason}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </CardContent>
            </Card>
          );
        }

        const b = bundles.get(r.id)!;
        const regByPart = new Map<string, { activityId: string; status: string }[]>();
        for (const rr of b.regRows) {
          const list = regByPart.get(rr.participantId) ?? [];
          list.push(rr);
          regByPart.set(rr.participantId, list);
        }
        const actName = new Map(b.acts.map((a) => [a.id, a.name]));
        const teamActs = b.acts.filter((a) => a.teamBased);

        return (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>{r.school}</CardTitle>
              <p className="text-sm text-muted-foreground">{r.event} · approved</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participants + their activity registrations */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Students</h3>
                {b.parts.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {p.name}
                        {p.detail && (
                          <span className="text-muted-foreground"> · {p.detail}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(regByPart.get(p.id) ?? []).map((rr) => (
                        <span key={rr.activityId} className="inline-flex items-center gap-1">
                          <Badge tone="neutral">{actName.get(rr.activityId)}</Badge>
                          <StatusBadge status={rr.status} />
                        </span>
                      ))}
                    </div>
                    {b.acts.length > 0 && (
                      <form action={registerParticipant} className="mt-2 flex items-end gap-2">
                        <input type="hidden" name="regId" value={r.id} />
                        <input type="hidden" name="participantId" value={p.id} />
                        <select
                          name="activityId"
                          required
                          className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                        >
                          {b.acts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" variant="outline">
                          Register
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
                {b.parts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No students added yet.</p>
                )}
                <form action={addParticipant} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="regId" value={r.id} />
                  <Input name="name" placeholder="Student name" className="h-9 w-48" required />
                  <Input name="detail" placeholder="Class / roll (optional)" className="h-9 w-48" />
                  <Button size="sm">Add student</Button>
                </form>
              </section>

              {/* Teams (team-based activities only) */}
              {teamActs.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Teams</h3>
                  {b.teamRows.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">
                        {t.name}{" "}
                        <span className="text-muted-foreground">
                          · {actName.get(t.activityId)}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {b.memberRows
                          .filter((m) => m.teamId === t.id)
                          .map((m, i) => (
                            <Badge key={i} tone="neutral">
                              {m.name}
                            </Badge>
                          ))}
                      </div>
                      <form action={addTeamMember} className="mt-2 flex items-end gap-2">
                        <input type="hidden" name="regId" value={r.id} />
                        <input type="hidden" name="teamId" value={t.id} />
                        <select
                          name="participantId"
                          required
                          className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                        >
                          {b.parts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" variant="outline">
                          Add member
                        </Button>
                      </form>
                    </div>
                  ))}
                  <form action={createTeam} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="regId" value={r.id} />
                    <select
                      name="activityId"
                      required
                      className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                    >
                      {teamActs.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <Input name="name" placeholder="Team name" className="h-9 w-48" required />
                    <Button size="sm">Create team</Button>
                  </form>
                </section>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
