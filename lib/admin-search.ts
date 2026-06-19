export type AdminCustomerSearchRow = {
  displayName: string;
  matchValue: string;
  customerId: string | null;
  orderTitles?: string[];
  samplePos: string[];
  allPos?: string[];
};

export function normalizeAdminSearchQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function poQueryVariants(query: string): string[] {
  const normalized = normalizeAdminSearchQuery(query);
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);
  const withoutPo = normalized.replace(/^po#?\s*/i, "").trim();
  if (withoutPo) variants.add(withoutPo);
  if (/^\d+$/.test(withoutPo)) variants.add(`po# ${withoutPo}`);
  return [...variants];
}

export function customerMatchesAdminSearch(
  customer: AdminCustomerSearchRow,
  rawQuery: string
): boolean {
  const query = normalizeAdminSearchQuery(rawQuery);
  if (!query) return true;

  const allPos = customer.allPos?.length ? customer.allPos : customer.samplePos;
  const poVariants = poQueryVariants(query);
  const haystacks = [
    customer.displayName,
    customer.matchValue,
    customer.customerId ?? "",
    ...(customer.orderTitles ?? []),
    ...allPos,
    ...allPos.map((po) => `po# ${po}`),
    ...customer.samplePos,
  ].map((value) => value.toLowerCase());

  return (
    haystacks.some((value) => value.includes(query)) ||
    poVariants.some((variant) =>
      allPos.some((po) => po.includes(variant) || variant.includes(po))
    )
  );
}
