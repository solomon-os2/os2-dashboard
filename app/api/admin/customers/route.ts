import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAdminCustomers } from "@/lib/admin-customers";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customers = await listAdminCustomers();
    const stats = {
      total: customers.filter((c) => c.matchValue !== "__missing_label__").length,
      withPin: customers.filter((c) => c.hasPin && c.matchValue !== "__missing_label__").length,
      withoutPin: customers.filter((c) => !c.hasPin && c.matchValue !== "__missing_label__").length,
      noAccount: customers.filter((c) => !c.hasAccount && c.matchValue !== "__missing_label__").length,
      missingLabel: customers.find((c) => c.matchValue === "__missing_label__")?.orderCount ?? 0,
    };
    return NextResponse.json({ customers, stats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load" },
      { status: 500 }
    );
  }
}
