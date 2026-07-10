import "server-only";

const EMAIL_FROM = "OS2 Portal <onboarding@resend.dev>";
const STAFF_NOTIFICATION_EMAIL = "solomon.os2performance@gmail.com";

export type StaffMessageNotification = {
  poNumber: string;
  orderTitle: string;
  customerName: string;
  message: string;
  cardId: string;
  boardId: string;
};

export async function notifyStaffOfCustomerMessage(
  payload: StaffMessageNotification
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return {
      sent: false,
      error: "RESEND_API_KEY not configured",
    };
  }

  const subject = `Portal message — PO# ${payload.poNumber} (${payload.customerName})`;
  const text = [
    "New customer message on the OS2 portal",
    "",
    `Customer: ${payload.customerName}`,
    `Order: PO# ${payload.poNumber} — ${payload.orderTitle}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [STAFF_NOTIFICATION_EMAIL],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    return { sent: false, error: await res.text() };
  }

  return { sent: true };
}
