import "server-only";

// Notification seam. Email via Resend REST (no SDK); no RESEND_API_KEY → log.
// Fire-and-forget with one retry (NFR-7): failures never block the caller.
export function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Eventide <onboarding@resend.dev>";

  if (!key) {
    console.log(`\n[mail:dev] to=${to}\nsubject=${subject}\n${html}\n`);
    return;
  }

  void (async () => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, subject, html }),
        });
        if (res.ok) return;
      } catch (e) {
        if (attempt === 2) console.error("[mail] send failed:", e);
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
    console.error("[mail] gave up after retries:", to);
  })();
}

// WhatsApp channel (FR-26). ponytail: stub until a provider is chosen (PRD §11
// open question) — logs unless WHATSAPP_API_URL/TOKEN are set, then POSTs.
export function sendWhatsApp(phone: string | null | undefined, text: string) {
  if (!phone) return;
  const url = process.env.WHATSAPP_API_URL;
  const tokenv = process.env.WHATSAPP_API_TOKEN;
  if (!url || !tokenv) {
    console.log(`\n[whatsapp:dev] to=${phone}\n${text}\n`);
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenv}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: phone, text }),
  }).catch((e) => console.error("[whatsapp] send failed:", e));
}
