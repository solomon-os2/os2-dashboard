export const CUSTOMER_LABEL_PREFIX = "Customer - ";
export const CUSTOMER_LABEL_COLOR = "blue_dark";

/** @deprecated Legacy migration only — do not use on new labels */
export const LEGACY_CUSTOMER_LABEL_PREFIX = "Customer · ";

export type TrelloLabelLike = { name: string; color?: string | null };

export function normalizeCustomerName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function customerNamesMatch(a: string, b: string): boolean {
  return normalizeCustomerName(a) === normalizeCustomerName(b);
}

export function parseCustomerLabel(labelName: string): string | null {
  const trimmed = labelName.trim();
  if (trimmed.startsWith(CUSTOMER_LABEL_PREFIX)) {
    return trimmed.slice(CUSTOMER_LABEL_PREFIX.length).trim() || null;
  }
  if (trimmed.startsWith(LEGACY_CUSTOMER_LABEL_PREFIX)) {
    return trimmed.slice(LEGACY_CUSTOMER_LABEL_PREFIX.length).trim() || null;
  }
  return null;
}

export function formatCustomerLabel(customerName: string): string {
  return `${CUSTOMER_LABEL_PREFIX}${customerName.trim()}`;
}

export function isCustomerLabel(label: TrelloLabelLike): boolean {
  return parseCustomerLabel(label.name) !== null;
}

export function isCanonicalCustomerLabel(label: TrelloLabelLike): boolean {
  return (
    label.color === CUSTOMER_LABEL_COLOR &&
    label.name.trim().startsWith(CUSTOMER_LABEL_PREFIX)
  );
}

export function getCustomerFromLabels(labels: TrelloLabelLike[]): string | null {
  const canonical = labels
    .filter(isCanonicalCustomerLabel)
    .map((label) => parseCustomerLabel(label.name))
    .filter((name): name is string => name !== null);

  if (canonical.length > 0) return canonical[0];

  const legacy = labels
    .map((label) => parseCustomerLabel(label.name))
    .filter((name): name is string => name !== null);

  return legacy[0] ?? null;
}

export function cardHasCustomer(
  labels: TrelloLabelLike[],
  customerName: string
): boolean {
  const cardCustomer = getCustomerFromLabels(labels);
  if (!cardCustomer) return false;
  return customerNamesMatch(cardCustomer, customerName);
}

export function isLegacyCustomerLabelName(name: string): boolean {
  return (
    name.trim().startsWith(CUSTOMER_LABEL_PREFIX) ||
    name.trim().startsWith(LEGACY_CUSTOMER_LABEL_PREFIX)
  );
}
