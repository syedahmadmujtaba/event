import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Cache the pool on globalThis so Next dev's HMR reuses one instead of opening
// a new Pool on every reload — that leak exhausts Neon's connection cap and
// surfaces as intermittent "Failed query" / connection timeouts.
const g = globalThis as unknown as { _pgPool?: Pool };
const pool =
  g._pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") g._pgPool = pool;

export const db = drizzle(pool, { schema });
