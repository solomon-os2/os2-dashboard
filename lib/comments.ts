export type PortalCommentSource = "customer" | "team";

export type ParsedPortalComment = {
  source: PortalCommentSource;
  body: string;
  trelloPrefix: string;
};

const CUSTOMER_FROM_PORTAL_RE = /^\[Customer\]:\s*/;
const STAFF_TO_CUSTOMER_RE = /^\[CUSTOMER\]:\s*/;

export function formatCustomerPortalComment(text: string): string {
  return `[Customer]: ${text.trim()}`;
}

export function formatStaffCustomerComment(text: string): string {
  return `[CUSTOMER]: ${text.trim()}`;
}

export function parseCommentForPortal(raw: string): ParsedPortalComment | null {
  const trimmed = raw.trimStart();
  if (!trimmed) return null;

  if (CUSTOMER_FROM_PORTAL_RE.test(trimmed)) {
    return {
      source: "customer",
      body: trimmed.replace(CUSTOMER_FROM_PORTAL_RE, "").trim(),
      trelloPrefix: "[Customer]:",
    };
  }

  if (STAFF_TO_CUSTOMER_RE.test(trimmed)) {
    return {
      source: "team",
      body: trimmed.replace(STAFF_TO_CUSTOMER_RE, "").trim(),
      trelloPrefix: "[CUSTOMER]:",
    };
  }

  return null;
}

export function portalCommentLabel(source: PortalCommentSource): string {
  return source === "customer" ? "Customer" : "OS2 Team";
}
