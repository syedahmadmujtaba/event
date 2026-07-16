import "server-only";

// One-function mailer. ponytail: no SDK — Resend's REST API is a single fetch.
// No RESEND_API_KEY → log to console so dev/CI works with zero setup.
// Fire-and-forget (NFR-7): failures log, never block the triggering action.
export function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Eventide <onboarding@resend.dev>";

  if (!key) {
    console.log(`\n[mail:dev] to=${to}\nsubject=${subject}\n${html}\n`);
    return;
  }

  void fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  }).catch((e) => console.error("[mail] send failed:", e));
}
