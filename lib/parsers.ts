const PO_RE = /^PO#\s*(\d+)\s+(.+)$/i;

export function parseOrderTitle(name: string) {
  const match = name.match(PO_RE);
  if (!match) return null;
  return {
    poNumber: match[1],
    customerText: match[2].trim(),
  };
}

export function isOrderCard(name: string): boolean {
  return PO_RE.test(name);
}

export function orderMatchesPo(poNumber: string, title: string): boolean {
  const parsed = parseOrderTitle(title);
  if (!parsed) return false;
  return parsed.poNumber === poNumber.trim();
}

export function poDisplayName(poNumber: string): string {
  return `PO# ${poNumber}`;
}

export function portalIdFromPo(poNumber: string): string {
  return slugifyCustomer(`PO ${poNumber.trim()}`);
}

export function slugifyCustomer(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toUpperCase();
}
