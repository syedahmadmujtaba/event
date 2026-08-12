import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser, can } from "@/lib/auth";
import { getSlip } from "@/lib/storage";

// Permission-gated slip access (NFR-3) — no public slip URLs anywhere.
// Delegation registration slips are reviewed on the delegations screen, so
// delegation approvers may view them (scoped to that payer type only).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const [pay] = await db
    .select({ slipRef: payments.slipRef, payerType: payments.payerType })
    .from(payments)
    .where(eq(payments.id, id));
  if (!pay) return new NextResponse("Not found", { status: 404 });

  const canView =
    can(user, "payment.verify") ||
    (can(user, "delegation.approve") && pay.payerType === "delegation_registration");
  if (!canView) return new NextResponse("Forbidden", { status: 403 });

  const slip = await getSlip(pay.slipRef);
  if (!slip) return new NextResponse("Not found", { status: 404 });
  if ("redirect" in slip) return NextResponse.redirect(slip.redirect);
  return new NextResponse(new Uint8Array(slip.body), {
    headers: { "Content-Type": slip.contentType, "Cache-Control": "private, no-store" },
  });
}
