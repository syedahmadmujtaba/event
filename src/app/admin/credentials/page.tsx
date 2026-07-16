import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { credentials, events, participants, delegationRegistrations, schools } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  participant: "Participant",
  delegation_registration: "Delegation official",
  visitor_ticket: "Visitor",
};

export default async function CredentialsPage() {
  await requirePermission("credential.issue");

  // Polymorphic holder resolved via left joins (UUIDs are unique across tables).
  const rows = await db
    .select({
      token: credentials.qrToken,
      type: credentials.holderType,
      event: events.name,
      pname: participants.name,
      sname: schools.name,
    })
    .from(credentials)
    .innerJoin(events, eq(events.id, credentials.eventId))
    .leftJoin(participants, eq(participants.id, credentials.holderId))
    .leftJoin(delegationRegistrations, eq(delegationRegistrations.id, credentials.holderId))
    .leftJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
    .orderBy(events.name);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credentials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issued cards. Open one to print or scan-verify it.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No credentials issued yet.</p>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {rows.map((r) => (
              <div key={r.token} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {r.type === "participant" ? r.pname : r.sname}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.event}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={r.type === "participant" ? "neutral" : "brand"}>
                    {TYPE_LABEL[r.type] ?? r.type}
                  </Badge>
                  <Link
                    href={`/credential/${r.token}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Open <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
