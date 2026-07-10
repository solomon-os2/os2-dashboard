/**
 * Send a test notification via Resend. Requires RESEND_API_KEY in .env.
 * Usage: npm run test-email
 */
import { loadEnv } from "./lib/load-env.mjs";

loadEnv();

const EMAIL_FROM = "OS2 Portal <onboarding@resend.dev>";
const STAFF_NOTIFICATION_EMAIL = "solomon.os2performance@gmail.com";

const apiKey = process.env.RESEND_API_KEY?.trim();

if (!apiKey) {
  console.error("Set RESEND_API_KEY in .env");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: EMAIL_FROM,
    to: [STAFF_NOTIFICATION_EMAIL],
    subject: "Portal message test — PO# 99004 (Test Customer One)",
    text: [
      "New customer message on the OS2 portal (TEST)",
      "",
      "Customer: Test Customer One",
      "Order: PO# 99004 — test order",
      "",
      "Message:",
      "This is a test portal notification.",
    ].join("\n"),
  }),
});

if (!res.ok) {
  console.error("FAIL:", await res.text());
  process.exit(1);
}

console.log("OK: Test email sent to", STAFF_NOTIFICATION_EMAIL);
