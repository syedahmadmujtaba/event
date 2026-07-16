// Self-check for host-path offline logic: the brute-force limiter and CSV parse.
// Mirrors host-auth.ts rateLimited + host-actions importHostStudents parsing.
// Run: node src/lib/host.test.mjs
import assert from "node:assert";

// --- mirror of rateLimited ---
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW = 15 * 60 * 1000;
function rateLimited(key, now = Date.now()) {
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { n: 1, resetAt: now + WINDOW });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_ATTEMPTS;
}

// 5 tries allowed, 6th blocked.
for (let i = 0; i < MAX_ATTEMPTS; i++) assert.equal(rateLimited("22-1"), false, `try ${i + 1} should pass`);
assert.equal(rateLimited("22-1"), true, "6th try must be blocked");
// A different roll is independent.
assert.equal(rateLimited("99-9"), false);
// Window reset lets it through again.
assert.equal(rateLimited("22-1", Date.now() + WINDOW + 1), false);

// --- mirror of CSV row parsing ---
function parseRow(line) {
  const [rollNumber, cnic, name, className] = line.split(",").map((s) => s.trim());
  if (!rollNumber || !cnic || !name) return null;
  if (/roll/i.test(rollNumber) && /cnic/i.test(cnic)) return null; // header
  return { rollNumber, cnic, name, className: className || null };
}
assert.deepEqual(parseRow("rollNumber,cnic,name,class"), null); // header skipped
assert.deepEqual(parseRow("22-118, 352021234, Ali Raza , 10-B"), {
  rollNumber: "22-118",
  cnic: "352021234",
  name: "Ali Raza",
  className: "10-B",
});
assert.equal(parseRow("22-118,352021234"), null); // missing name → skipped
assert.equal(parseRow("22-118,352021234,Ali").className, null); // no class → null

console.log("OK");
