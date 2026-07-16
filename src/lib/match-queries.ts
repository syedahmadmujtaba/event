import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { teams, participants } from "@/db/schema";

type MatchRow = {
  sideAType: string; sideAId: string; sideBType: string; sideBId: string;
};

/** Resolve every side (team or participant) to a display name in one batch. */
export async function sideNameMap(rows: MatchRow[]): Promise<Map<string, string>> {
  const teamIds = new Set<string>();
  const partIds = new Set<string>();
  for (const m of rows) {
    (m.sideAType === "team" ? teamIds : partIds).add(m.sideAId);
    (m.sideBType === "team" ? teamIds : partIds).add(m.sideBId);
  }
  const names = new Map<string, string>();
  if (teamIds.size) {
    for (const t of await db.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, [...teamIds])))
      names.set(t.id, t.name);
  }
  if (partIds.size) {
    for (const p of await db.select({ id: participants.id, name: participants.name }).from(participants).where(inArray(participants.id, [...partIds])))
      names.set(p.id, p.name);
  }
  return names;
}
