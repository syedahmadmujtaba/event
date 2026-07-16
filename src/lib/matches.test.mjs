// Offline self-check for match display logic (mirrors match-queries.sideNameMap
// partitioning + the winner-side → side-id resolution). Run: node src/lib/matches.test.mjs
import assert from "node:assert";

// --- mirror of sideNameMap's id partitioning ---
function partition(rows) {
  const teamIds = new Set();
  const partIds = new Set();
  for (const m of rows) {
    (m.sideAType === "team" ? teamIds : partIds).add(m.sideAId);
    (m.sideBType === "team" ? teamIds : partIds).add(m.sideBId);
  }
  return { teamIds, partIds };
}

const { teamIds, partIds } = partition([
  { sideAType: "team", sideAId: "T1", sideBType: "team", sideBId: "T2" },
  { sideAType: "participant", sideAId: "P1", sideBType: "participant", sideBId: "P2" },
  { sideAType: "team", sideAId: "T1", sideBType: "participant", sideBId: "P3" }, // mixed + dupe
]);
assert.deepEqual([...teamIds].sort(), ["T1", "T2"]);
assert.deepEqual([...partIds].sort(), ["P1", "P2", "P3"]);

// --- winner-side resolution (mirrors the admin/schedule render) ---
const m = { sideAId: "A", sideBId: "B" };
const winnerId = (side) => (side === "draw" ? "Draw" : side === "a" ? m.sideAId : m.sideBId);
assert.equal(winnerId("a"), "A");
assert.equal(winnerId("b"), "B");
assert.equal(winnerId("draw"), "Draw");

console.log("OK");
