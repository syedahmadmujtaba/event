import "server-only";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

// Payment-slip storage seam. Production: Cloudinary as a private/authenticated
// asset, served via a signed URL (NFR-3). No creds (dev/CI): a gitignored
// .uploads/ dir so the flow is exercisable. slipRef is opaque to callers.
// ponytail: Cloudinary delivery-URL signing below follows the documented
// algorithm but is unverified without live creds — confirm on first real upload.

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const LOCAL_DIR = path.join(process.cwd(), ".uploads");

/** Cloudinary upload signature: sorted `k=v` joined by `&`, then secret, sha1 hex. */
export function signParams(params: Record<string, string | number>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const CT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT).map(([ct, e]) => [e, ct]),
);

export async function uploadSlip(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = EXT[file.type] ?? "bin";

  if (!CLOUD || !KEY || !SECRET) {
    await mkdir(LOCAL_DIR, { recursive: true });
    const name = `${randomBytes(16).toString("hex")}.${ext}`;
    await writeFile(path.join(LOCAL_DIR, name), buf);
    return `local:${name}`;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ timestamp, type: "authenticated" }, SECRET);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: file.type }));
  form.append("api_key", KEY);
  form.append("timestamp", String(timestamp));
  form.append("type", "authenticated");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  const j = (await res.json()) as { public_id: string; resource_type: string; format: string };
  return `cloudinary:${j.resource_type}:${j.format}:${j.public_id}`;
}

/** What the gated route needs to serve a slip: a redirect URL, or bytes to stream. */
export async function getSlip(
  ref: string,
): Promise<{ redirect: string } | { body: Buffer; contentType: string } | null> {
  if (ref.startsWith("local:")) {
    const name = ref.slice("local:".length);
    if (name.includes("/") || name.includes("..")) return null; // path-traversal guard
    try {
      const body = await readFile(path.join(LOCAL_DIR, name));
      const ext = name.split(".").pop() ?? "";
      return { body, contentType: CT[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  if (ref.startsWith("cloudinary:") && CLOUD && SECRET) {
    const [, resourceType, format, ...rest] = ref.split(":");
    const publicId = rest.join(":");
    // Signed authenticated delivery URL: s--<sha1(public_id+secret)[0:8] b64url>--
    const sig = createHash("sha1")
      .update(publicId + SECRET)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .slice(0, 8);
    return {
      redirect: `https://res.cloudinary.com/${CLOUD}/${resourceType}/authenticated/s--${sig}--/${publicId}.${format}`,
    };
  }
  return null;
}
