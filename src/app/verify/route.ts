import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/email-verification";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = await verifyToken(token);
  return NextResponse.redirect(
    new URL(ok ? "/login?verified=1" : "/login?verified=0", req.url),
  );
}
