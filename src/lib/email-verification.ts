import "server-only";
import { randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";

const MAX_AGE = 60 * 60 * 24; // 24h

/** Creates a token and returns the absolute verify URL to email. */
export async function createVerificationUrl(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(emailVerificationTokens).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + MAX_AGE * 1000),
  });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/verify?token=${token}`;
}

/** Marks the user verified. Returns true on success. Single-use token. */
export async function verifyToken(token: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: emailVerificationTokens.userId })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.token, token),
        gt(emailVerificationTokens.expiresAt, new Date()),
      ),
    );
  if (!row) return false;

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, row.userId));
  return true;
}
