"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/Table";
import { customerMatchesAdminSearch } from "@/lib/admin-search";
import { cn } from "@/lib/utils";

export type AdminCustomerRow = {
  matchValue: string;
  displayName: string;
  customerId: string | null;
  orderCount: number;
  orderTitles: string[];
  samplePos: string[];
  allPos: string[];
  hasAccount: boolean;
  hasPin: boolean;
  createdAt: string | null;
};

type Filter = "all" | "with-pin" | "without-pin" | "no-account";

type GeneratedPin = {
  matchValue: string;
  customerId: string;
  displayName: string;
  pin: string;
};

export function AdminCustomerTable({
  initialCustomers,
  initialStats,
}: {
  initialCustomers: AdminCustomerRow[];
  initialStats: {
    total: number;
    withPin: number;
    withoutPin: number;
    noAccount: number;
  };
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [generatedPins, setGeneratedPins] = useState<Record<string, GeneratedPin>>({});
  const [copiedField, setCopiedField] = useState<{ matchKey: string; field: "id" | "pin" } | null>(
    null
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (!customerMatchesAdminSearch(c, search)) return false;
      if (filter === "with-pin") return c.hasPin;
      if (filter === "without-pin") return !c.hasPin;
      if (filter === "no-account") return !c.hasAccount;
      return true;
    });
  }, [customers, filter, search]);

  async function refresh() {
    const res = await fetch("/api/admin/customers");
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data.customers);
    setStats(data.stats);
  }

  function rememberPin(result: GeneratedPin, matchValue: string) {
    const key = matchValue.toLowerCase();
    setGeneratedPins((prev) => ({
      ...prev,
      [key]: { ...result, matchValue: key },
    }));
  }

  function getGeneratedPin(customer: AdminCustomerRow): GeneratedPin | undefined {
    return generatedPins[customer.matchValue.toLowerCase()];
  }

  async function generateOne(matchValue: string) {
    setLoading(matchValue);
    const res = await fetch("/api/admin/customers/generate-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "single", matchValue }),
    });
    const data = await res.json();
    if (res.ok) {
      rememberPin(data.result, matchValue);
      await refresh();
    }
    setLoading(null);
  }

  async function generateBulk() {
    setBulkLoading(true);
    const res = await fetch("/api/admin/customers/generate-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk" }),
    });
    const data = await res.json();
    if (res.ok) {
      setGeneratedPins((prev) => {
        const next = { ...prev };
        for (const result of data.results as GeneratedPin[]) {
          const key = (result.matchValue ?? "").toLowerCase();
          if (key) next[key] = { ...result, matchValue: key };
        }
        return next;
      });
      await refresh();
    }
    setBulkLoading(false);
  }

  async function copyText(text: string, matchKey: string, field: "id" | "pin") {
    await navigator.clipboard.writeText(text);
    setCopiedField({ matchKey, field });
    window.setTimeout(
      () =>
        setCopiedField((current) =>
          current?.matchKey === matchKey && current.field === field ? null : current
        ),
      2000
    );
  }

  function isCopied(matchKey: string, field: "id" | "pin") {
    return copiedField?.matchKey === matchKey && copiedField.field === field;
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.total },
    { id: "with-pin", label: "Has PIN", count: stats.withPin },
    { id: "without-pin", label: "No PIN", count: stats.withoutPin },
    { id: "no-account", label: "No account", count: stats.noAccount },
  ];

  const hasUnsavedPins = Object.keys(generatedPins).length > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "filter-card",
              filter === f.id && "filter-card-active"
            )}
          >
            <p className="text-[1.1rem] font-semibold tabular-nums text-[var(--text-primary)]">
              {f.count}
            </p>
            <p className="text-[0.8rem] text-[var(--text-muted)]">{f.label}</p>
          </button>
        ))}
      </div>

      <GlassCard className="card-padded space-y-3">
        <p className="text-[0.8rem] text-[var(--text-secondary)]">
          PINs are stored hashed in the database. Customer ID stays visible after account
          creation — use <strong className="text-[var(--text-primary)]">Copy ID</strong> anytime.
          PIN is shown once after generate/regenerate — use{" "}
          <strong className="text-[var(--text-primary)]">Copy</strong> copies the PIN only,
          before refreshing.
          Lost customer PIN? Regenerate and send manually (self-serve reset email coming later).
        </p>
        {hasUnsavedPins && (
          <p className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-900">
            You have unsaved PINs on this page. Copy them before refreshing or leaving.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers or PO#..."
            autoComplete="off"
            spellCheck={false}
            className="input max-w-md"
          />
          {search.trim() ? (
            <p className="text-[0.8rem] text-[var(--text-muted)]">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
              {filter !== "all"
                ? ` in ${filters.find((f) => f.id === filter)?.label ?? filter}`
                : ""}
            </p>
          ) : null}
          <GlassButton
            onClick={generateBulk}
            loading={bulkLoading}
            disabled={stats.withoutPin === 0}
          >
            Generate all missing ({stats.withoutPin})
          </GlassButton>
        </div>
      </GlassCard>

      <div className="card overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <Th>PO</Th>
              <Th>Orders</Th>
              <Th>Portal ID</Th>
              <Th>Status</Th>
              <Th align="right">Action</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((c) => {
              const generated = getGeneratedPin(c);
              const matchKey = c.matchValue.toLowerCase();
              const portalId = c.customerId ?? generated?.customerId ?? null;
              return (
                <TableRow key={c.matchValue}>
                  <Td>
                    <p className="font-medium text-[var(--text-primary)]">{c.displayName}</p>
                    {c.orderTitles.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.orderTitles.map((title) => (
                          <span key={title} className="badge badge-muted">
                            {title}
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>{c.orderCount}</Td>
                  <Td>
                    <code className="text-[0.6875rem] text-[var(--navy)]">
                      {portalId ?? "—"}
                    </code>
                    {generated && (
                      <p className="mt-0.5 text-[0.6875rem] font-medium tabular-nums text-[var(--navy)]">
                        PIN {generated.pin}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge customer={c} />
                  </Td>
                  <Td align="right" className="!whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-2">
                      <GlassButton
                        variant="ghost"
                        loading={loading === c.matchValue}
                        onClick={() => generateOne(c.matchValue)}
                      >
                        {c.hasPin ? "Regenerate" : "Generate PIN"}
                      </GlassButton>
                      {portalId ? (
                        <GlassButton
                          variant="ghost"
                          onClick={() => copyText(portalId, matchKey, "id")}
                        >
                          {isCopied(matchKey, "id") ? "Copied" : "Copy ID"}
                        </GlassButton>
                      ) : null}
                      {generated ? (
                        <GlassButton
                          variant="primary"
                          onClick={() => copyText(generated.pin, matchKey, "pin")}
                        >
                          {isCopied(matchKey, "pin") ? "Copied" : "Copy"}
                        </GlassButton>
                      ) : null}
                    </div>
                  </Td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-[0.75rem] text-[var(--text-muted)]">
            No customers match.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ customer }: { customer: AdminCustomerRow }) {
  if (customer.hasPin) {
    return <span className="badge badge-active">Has PIN</span>;
  }
  if (customer.hasAccount) {
    return <span className="badge badge-navy">No PIN</span>;
  }
  return <span className="badge badge-muted">No account</span>;
}
