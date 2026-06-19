export type PortalCommentSource = "customer" | "team";

export type ParsedPortalComment = {
  source: PortalCommentSource;
  body: string;
  trelloPrefix: string;
};

const CUSTOMER_PREFIXES = [
  /^Customer ·\s+/,
  /^\[Customer\]:\s*/,
] as const;

const STAFF_PREFIXES = [
  /^CUSTOMER ·\s+/,
  /^\[CUSTOMER\]:\s*/,
] as const;

export function formatCustomerPortalComment(text: string): string {
  return `Customer · ${text.trim()}`;
}

export function formatStaffCustomerComment(text: string): string {
  return `CUSTOMER · ${text.trim()}`;
}

function stripPrefix(
  text: string,
  patterns: readonly RegExp[]
): string | null {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return text.replace(pattern, "").trim();
    }
  }
  return null;
}

export function parseCommentForPortal(raw: string): ParsedPortalComment | null {
  const trimmed = raw.trimStart();
  if (!trimmed) return null;

  const customerBody = stripPrefix(trimmed, CUSTOMER_PREFIXES);
  if (customerBody !== null) {
    if (!customerBody) return null;
    return {
      source: "customer",
      body: customerBody,
      trelloPrefix: "Customer ·",
    };
  }

  const staffBody = stripPrefix(trimmed, STAFF_PREFIXES);
  if (staffBody !== null) {
    if (!staffBody) return null;
    return {
      source: "team",
      body: staffBody,
      trelloPrefix: "CUSTOMER ·",
    };
  }

  return null;
}

export function portalCommentLabel(source: PortalCommentSource): string {
  return source === "customer" ? "Customer" : "OS2 Team";
}
