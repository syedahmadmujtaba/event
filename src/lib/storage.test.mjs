// Self-check for storage.ts's correctness-critical, network-free logic.
// Mirrors signParams + the local-ref traversal guard (kept in lockstep with
// storage.ts). Run: node src/lib/storage.test.mjs
import assert from "node:assert";
import { createHash } from "node:crypto";

// --- mirror of signParams ---
function signParams(params, secret) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

// Key-order independence (the bug that silently breaks Cloudinary auth).
assert.equal(
  signParams({ timestamp: 100, type: "authenticated" }, "s"),
  signParams({ type: "authenticated", timestamp: 100 }, "s"),
);
// Deterministic 40-char hex.
assert.match(signParams({ a: 1 }, "s"), /^[0-9a-f]{40}$/);
// Secret actually participates.
assert.notEqual(signParams({ a: 1 }, "s1"), signParams({ a: 1 }, "s2"));

// --- mirror of the local: traversal guard in getSlip ---
const bad = (name) => name.includes("/") || name.includes("..");
assert.equal(bad("../../etc/passwd"), true);
assert.equal(bad("a/b.png"), true);
assert.equal(bad("deadbeef.png"), false);

console.log("OK");
