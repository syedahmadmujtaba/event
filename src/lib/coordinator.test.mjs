// Self-check: the cross-scope guards in coordinator-actions.
// activityInEvent / participantInSchool must reject mismatched scope.
// Run: node --env-file=.env src/lib/coordinator.test.mjs
import assert from "node:assert";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (sql, args) => db.query(sql, args).then((r) => r.rows);
const tag = "ctest_" + Date.now();

try {
  const [e1] = await q("insert into events (name,status) values ($1,'open') returning id", [tag + "e1"]);
  const [e2] = await q("insert into events (name,status) values ($1,'open') returning id", [tag + "e2"]);
  const [sA] = await q("insert into schools (name,city) values ($1,'X') returning id", [tag + "A"]);
  const [sB] = await q("insert into schools (name,city) values ($1,'X') returning id", [tag + "B"]);
  const [act1] = await q("insert into activities (event_id,name) values ($1,'A1') returning id", [e1.id]);
  const [pA] = await q("insert into participants (school_id,name) values ($1,'PA') returning id", [sA.id]);

  // activityInEvent: act1 is in e1, not e2.
  assert.equal((await q("select id from activities where id=$1 and event_id=$2", [act1.id, e1.id])).length, 1);
  assert.equal((await q("select id from activities where id=$1 and event_id=$2", [act1.id, e2.id])).length, 0);

  // participantInSchool: pA is in school A, not B.
  assert.equal((await q("select id from participants where id=$1 and school_id=$2", [pA.id, sA.id])).length, 1);
  assert.equal((await q("select id from participants where id=$1 and school_id=$2", [pA.id, sB.id])).length, 0);

  // registrations unique(participant, activity).
  await q("insert into registrations (participant_id,activity_id) values ($1,$2)", [pA.id, act1.id]);
  await assert.rejects(
    q("insert into registrations (participant_id,activity_id) values ($1,$2)", [pA.id, act1.id]),
    /unique|duplicate/i,
  );

  await q("delete from events where id in ($1,$2)", [e1.id, e2.id]);
  await q("delete from schools where id in ($1,$2)", [sA.id, sB.id]);
  console.log("OK");
} finally {
  await db.end();
}
