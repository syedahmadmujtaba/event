import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, events, teams, participants, registrations, matches } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { sideNameMap } from "@/lib/match-queries";
import { createMatch, setMatchStatus, setMatchResult, deleteMatch } from "@/lib/match-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  await requirePermission("match.manage");

  const comps = await db
    .select({ id: activities.id, name: activities.name, teamBased: activities.teamBased, event: events.name })
    .from(activities)
    .innerJoin(events, eq(events.id, activities.eventId))
    .where(eq(activities.kind, "competitive"))
    .orderBy(events.name);

  const compIds = comps.map((c) => c.id);
  const allMatches = compIds.length
    ? await db.select().from(matches).where(inArray(matches.activityId, compIds))
    : [];
  const names = await sideNameMap(allMatches);

  // Entrants per activity: teams (team-based) or registered participants.
  const entrants = new Map<string, { id: string; name: string; type: "team" | "participant" }[]>();
  for (const c of comps) {
    if (c.teamBased) {
      const ts = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.activityId, c.id));
      entrants.set(c.id, ts.map((t) => ({ ...t, type: "team" as const })));
    } else {
      const ps = await db
        .select({ id: participants.id, name: participants.name })
        .from(registrations)
        .innerJoin(participants, eq(participants.id, registrations.participantId))
        .where(eq(registrations.activityId, c.id));
      entrants.set(c.id, ps.map((p) => ({ ...p, type: "participant" as const })));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create fixtures and record results.</p>
      </div>

      {comps.length === 0 && (
        <p className="text-sm text-muted-foreground">No competitive activities yet.</p>
      )}

      {comps.map((c) => {
        const es = entrants.get(c.id) ?? [];
        const sideType = c.teamBased ? "team" : "participant";
        const ms = allMatches.filter((m) => m.activityId === c.id);
        return (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-base">{c.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{c.event}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {ms.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {names.get(m.sideAId) ?? "?"} vs {names.get(m.sideBId) ?? "?"}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={m.status} />
                      <form action={deleteMatch}>
                        <input type="hidden" name="matchId" value={m.id} />
                        <Button size="icon" variant="ghost" title="Delete">
                          <Trash2 />
                        </Button>
                      </form>
                    </div>
                  </div>
                  {(m.venue || m.scheduledAt) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.venue}
                      {m.scheduledAt ? ` · ${m.scheduledAt.toISOString().slice(0, 16).replace("T", " ")}` : ""}
                    </p>
                  )}
                  {m.status === "completed" ? (
                    <p className="mt-1 text-xs">
                      Result: {m.result ?? "—"} · Winner:{" "}
                      {m.winnerSide === "draw"
                        ? "Draw"
                        : names.get(m.winnerSide === "a" ? m.sideAId : m.sideBId) ?? "—"}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      {m.status === "scheduled" && (
                        <form action={setMatchStatus}>
                          <input type="hidden" name="matchId" value={m.id} />
                          <input type="hidden" name="status" value="ongoing" />
                          <Button size="sm" variant="outline">Start</Button>
                        </form>
                      )}
                      <form action={setMatchResult} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="matchId" value={m.id} />
                        <Input name="result" placeholder="Score" className="h-8 w-28" />
                        <select
                          name="winnerSide"
                          className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                        >
                          <option value="a">{names.get(m.sideAId) ?? "Side A"} wins</option>
                          <option value="b">{names.get(m.sideBId) ?? "Side B"} wins</option>
                          <option value="draw">Draw</option>
                        </select>
                        <Button size="sm">Record result</Button>
                      </form>
                    </div>
                  )}
                </div>
              ))}

              {es.length >= 2 ? (
                <form action={createMatch} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                  <input type="hidden" name="activityId" value={c.id} />
                  <input type="hidden" name="sideType" value={sideType} />
                  <select name="sideAId" required className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary">
                    {es.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                  </select>
                  <span className="self-center text-sm text-muted-foreground">vs</span>
                  <select name="sideBId" required className="h-9 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary">
                    {es.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                  </select>
                  <Input name="venue" placeholder="Venue" className="h-9 w-32" />
                  <Input name="scheduledAt" type="datetime-local" className="h-9 w-48" />
                  <Button size="sm">Create match</Button>
                </form>
              ) : (
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Need at least two {sideType === "team" ? "teams" : "registered participants"} to create a match.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
