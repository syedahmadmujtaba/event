import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { credentials, events, participants, delegationRegistrations, schools, visitorTickets, visitors } from "@/db/schema";
import { qrDataUrl } from "@/lib/credentials";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  participant: "Participant",
  delegation_registration: "Delegation official",
  visitor_ticket: "Visitor",
};

async function holderName(holderType: string, holderId: string): Promise<string> {
  if (holderType === "participant") {
    const [p] = await db.select({ name: participants.name }).from(participants).where(eq(participants.id, holderId));
    return p?.name ?? "Unknown";
  }
  if (holderType === "delegation_registration") {
    const [s] = await db
      .select({ name: schools.name })
      .from(delegationRegistrations)
      .innerJoin(schools, eq(schools.id, delegationRegistrations.schoolId))
      .where(eq(delegationRegistrations.id, holderId));
    return s?.name ?? "Unknown";
  }
  if (holderType === "visitor_ticket") {
    const [v] = await db
      .select({ name: visitors.name })
      .from(visitorTickets)
      .innerJoin(visitors, eq(visitors.id, visitorTickets.visitorId))
      .where(eq(visitorTickets.id, holderId));
    return v?.name ?? "Unknown";
  }
  return "Unknown";
}

export default async function CredentialPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [cred] = await db.select().from(credentials).where(eq(credentials.qrToken, token));

  if (!cred) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldX className="size-12 text-status-rejected" />
          <h1 className="text-xl font-bold">Invalid credential</h1>
          <p className="text-sm text-muted-foreground">This QR code does not match any issued card.</p>
        </div>
      </div>
    );
  }

  const [event] = await db.select({ name: events.name }).from(events).where(eq(events.id, cred.eventId));
  const [name, qr] = await Promise.all([holderName(cred.holderType, cred.holderId), qrDataUrl(cred.qrToken)]);

  return (
    <div className="grid min-h-screen place-items-center bg-surface-muted p-6 print:bg-white">
      <div className="w-full max-w-sm space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm print:shadow-none">
          <div className="flex items-center justify-between bg-primary px-5 py-3 text-primary-foreground">
            <span className="font-display text-lg font-bold">Eventide</span>
            <Badge tone="verified">
              <ShieldCheck className="size-3.5" /> Valid
            </Badge>
          </div>
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Image src={qr} alt="QR code" width={220} height={220} unoptimized />
            <div>
              <p className="font-display text-xl font-bold">{name}</p>
              <p className="text-sm text-muted-foreground">
                {TYPE_LABEL[cred.holderType] ?? cred.holderType} · {event?.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
