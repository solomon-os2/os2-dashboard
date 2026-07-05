import { createSupabaseAdmin } from "./supabase";
import { customerNamesMatch } from "./customer-labels";
import { portalIdFromCustomer } from "./parsers";
import bcrypt from "bcryptjs";

function toAuthResult(data: {
  customer_id: string;
  display_name: string;
  match_value: string;
  board_id: string;
}) {
  return {
    customerId: data.customer_id,
    displayName: data.display_name,
    matchValue: data.match_value,
    boardId: data.board_id,
  };
}

function loginMatchesRow(login: string, row: {
  customer_id: string;
  display_name: string;
  match_value: string;
}): boolean {
  const trimmed = login.trim();
  if (!trimmed) return false;

  const slug = portalIdFromCustomer(trimmed);
  if (row.customer_id === slug) return true;
  if (customerNamesMatch(row.match_value, trimmed)) return true;
  if (customerNamesMatch(row.display_name, trimmed)) return true;

  return false;
}

export async function authenticateCustomer(login: string, pin: string) {
  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase.from("customers").select("*");

  if (error || !rows?.length) return null;

  const matches = rows.filter((row) => loginMatchesRow(login, row));
  if (!matches.length) return null;

  const masterPassword = process.env.ADMIN_PASSWORD;
  if (masterPassword && pin === masterPassword) {
    return toAuthResult(matches[0]);
  }

  for (const row of matches) {
    if (!row.pin_hash) continue;
    const valid = await bcrypt.compare(pin, row.pin_hash);
    if (valid) return toAuthResult(row);
  }

  return null;
}
