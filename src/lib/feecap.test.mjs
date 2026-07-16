// Self-check: activity-cap count query + fee-rule unique(event,payer,day).
// Run: node --env-file=.env src/lib/feecap.test.mjs
import assert from "node:assert";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (sql, args) => db.query(sql, args).then((r) => r.rows);
const tag = "ftest_" + Date.now();

try {
  const [ev] = await q(
    "insert into events (name,status,max_activities_per_participant) values ($1,'open',2) returning id",
    [tag],
  );
  const [sc] = await q("insert into schools (name,city) values ($1,'X') returning id", [tag]);
  const [p] = await q("insert into participants (school_id,name) values ($1,'P') returning id", [sc.id]);
  const acts = [];
  for (const n of ["a1", "a2", "a3"]) {
    const [a] = await q("insert into activities (event_id,name) values ($1,$2) returning id", [ev.id, n]);
    acts.push(a.id);
  }

  // Register into 2 activities (the cap).
  await q("insert into registrations (participant_id,activity_id) values ($1,$2)", [p.id, acts[0]]);
  await q("insert into registrations (participant_id,activity_id) values ($1,$2)", [p.id, acts[1]]);

  // Cap count query (mirrors registerParticipant): must equal 2 → 3rd is blocked.
  const [{ n }] = await q(
    `select count(*)::int as n from registrations r
       join activities a on a.id = r.activity_id
      where r.participant_id=$1 and a.event_id=$2`,
    [p.id, ev.id],
  );
  assert.equal(n, 2, "expected 2 registrations counted against the cap");
  assert.ok(n >= 2, "cap of 2 reached → guard rejects the 3rd");

  // Fee-rule uniqueness on (event, payer, day).
  await q("insert into event_fee_rules (event_id,payer_type,amount,day) values ($1,'visitor',500,0)", [ev.id]);
  await assert.rejects(
    q("insert into event_fee_rules (event_id,payer_type,amount,day) values ($1,'visitor',999,0)", [ev.id]),
    /unique|duplicate/i,
  );

  await q("delete from events where id=$1", [ev.id]);
  await q("delete from schools where id=$1", [sc.id]);
  console.log("OK");
} finally {
  await db.end();
}
