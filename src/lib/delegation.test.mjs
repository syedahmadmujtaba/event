// Self-check: open-event guard + one-registration-per-(school,event).
// Run: node --env-file=.env src/lib/delegation.test.mjs
import assert from "node:assert";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (sql, args) => db.query(sql, args).then((r) => r.rows);
const tag = "test_" + Date.now();

try {
  const [ev] = await q(
    "insert into events (name, status) values ($1,'open') returning id",
    [tag],
  );
  const [sc] = await q(
    "insert into schools (name, city) values ($1,'Testville') returning id",
    [tag],
  );
  const [u] = await q(
    "insert into users (name,email,password_hash) values ('T',$1,'x') returning id",
    [tag + "@e.co"],
  );

  // First registration for (school,event) succeeds.
  await q(
    "insert into delegation_registrations (school_id,event_id,coordinator_user_id) values ($1,$2,$3)",
    [sc.id, ev.id, u.id],
  );

  // Second for same (school,event) violates the unique constraint.
  await assert.rejects(
    q(
      "insert into delegation_registrations (school_id,event_id,coordinator_user_id) values ($1,$2,$3)",
      [sc.id, ev.id, u.id],
    ),
    /unique|duplicate/i,
  );

  // Open-event guard: this query (mirrors registerDelegation) finds an open event...
  const open = await q("select id from events where id=$1 and status='open'", [ev.id]);
  assert.equal(open.length, 1);
  // ...and finds nothing once it's closed.
  await q("update events set status='closed' where id=$1", [ev.id]);
  const closed = await q("select id from events where id=$1 and status='open'", [ev.id]);
  assert.equal(closed.length, 0);

  // Cleanup (cascades to registration).
  await q("delete from events where id=$1", [ev.id]);
  await q("delete from schools where id=$1", [sc.id]);
  await q("delete from users where id=$1", [u.id]);

  console.log("OK");
} finally {
  await db.end();
}
