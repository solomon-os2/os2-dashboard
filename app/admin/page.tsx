import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listAdminCustomers } from "@/lib/admin-customers";
import { getAdminBoardContext } from "@/lib/board";
import { AdminCustomerTable } from "@/components/admin/AdminCustomerTable";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { BoardSelect } from "@/components/admin/BoardSelect";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageShell } from "@/components/layout/PageShell";

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect("/admin/login");

  const [{ boards, boardId, boardName }, customers] = await Promise.all([
    getAdminBoardContext(),
    listAdminCustomers(),
  ]);

  const stats = {
    total: customers.filter((c) => c.matchValue !== "__missing_label__").length,
    withPin: customers.filter((c) => c.hasPin && c.matchValue !== "__missing_label__").length,
    withoutPin: customers.filter((c) => !c.hasPin && c.matchValue !== "__missing_label__").length,
    noAccount: customers.filter((c) => !c.hasAccount && c.matchValue !== "__missing_label__").length,
    missingLabel: customers.find((c) => c.matchValue === "__missing_label__")?.orderCount ?? 0,
  };

  return (
    <div className="min-h-screen">
      <AppHeader
        eyebrow="OS2 Staff"
        title="Customer accounts"
        subtitle={`${boardName} · ${stats.total} customers`}
        actions={
          <>
            <Link
              href="/login"
              className="text-[0.8rem] text-white/55 transition-colors hover:text-white"
            >
              Customer portal →
            </Link>
            <AdminLogoutButton />
          </>
        }
      />

      <PageShell>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8rem] text-[var(--text-secondary)]">
            PINs are scoped to the selected Trello board. Pick a board to manage
            customers and generate portal access.
          </p>
          <BoardSelect boards={boards} selectedBoardId={boardId} />
        </div>
        <AdminCustomerTable initialCustomers={customers} initialStats={stats} />
      </PageShell>
    </div>
  );
}
