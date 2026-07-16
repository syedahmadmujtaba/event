import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { visitorTickets, visitors, events, payments, credentials } from "@/db/schema";
import { submitVisitorPayment } from "@/lib/visitor-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function VisitorTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [ticket] = await db
    .select({
      id: visitorTickets.id,
      status: visitorTickets.status,
      eventId: visitorTickets.eventId,
      event: events.name,
      visitor: visitors.name,
    })
    .from(visitorTickets)
    .innerJoin(events, eq(events.id, visitorTickets.eventId))
    .innerJoin(visitors, eq(visitors.id, visitorTickets.visitorId))
    .where(eq(visitorTickets.token, token));
  if (!ticket) notFound();

  const [pays, creds] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(and(eq(payments.payerType, "visitor_ticket"), eq(payments.payerId, ticket.id)))
      .orderBy(desc(payments.createdAt)),
    db
      .select({ qrToken: credentials.qrToken })
      .from(credentials)
      .where(and(eq(credentials.holderType, "visitor_ticket"), eq(credentials.holderId, ticket.id))),
  ]);
  const pay = pays[0];

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{ticket.event}</CardTitle>
          <p className="text-sm text-muted-foreground">Visitor: {ticket.visitor}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <StatusBadge status={ticket.status === "verified" ? "verified" : pay?.status ?? "pending"} />
          </div>
          {pay?.status === "rejected" && pay.rejectionReason && (
            <p className="text-sm text-muted-foreground">Rejected: {pay.rejectionReason}</p>
          )}

          {ticket.status !== "verified" && pay?.status !== "submitted" && (
            <form action={submitVisitorPayment} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="token" value={token} />
              <input
                type="file"
                name="slip"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                required
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              />
              <Button size="sm">Upload slip</Button>
            </form>
          )}

          {creds.length > 0 && (
            <a
              href={`/credential/${creds[0].qrToken}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary"
            >
              View entry ticket
            </a>
          )}
          <p className="text-xs text-muted-foreground">Bookmark this page to check your ticket status.</p>
        </CardContent>
      </Card>
    </div>
  );
}
