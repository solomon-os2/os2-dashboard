import { createSupabaseAdmin } from "./supabase";
import { getBoardId } from "./board";
import { fetchBoardCards } from "./trello";
import { parseOrderTitle, poDisplayName, portalIdFromPo } from "./parsers";
import bcrypt from "bcryptjs";

export type AdminCustomer = {
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

export type PinGenerationResult = {
  matchValue: string;
  customerId: string;
  displayName: string;
  pin: string;
};

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function listAdminCustomers(): Promise<AdminCustomer[]> {
  const boardId = getBoardId();
  const [cards, supabase] = await Promise.all([
    fetchBoardCards(),
    Promise.resolve(createSupabaseAdmin()),
  ]);

  const { data: dbCustomers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("board_id", boardId);

  if (error) {
    if (error.message.includes("schema cache") || error.message.includes("does not exist")) {
      throw new Error(
        "Supabase table 'customers' is missing. Run: npm run db:setup"
      );
    }
    if (error.message.includes("board_id")) {
      throw new Error(
        "customers.board_id column missing. Run: npm run db:setup"
      );
    }
    throw new Error(error.message);
  }

  const byPo = new Map<
    string,
    { displayName: string; orderCount: number; orderTitles: string[] }
  >();

  for (const card of cards) {
    const parsed = parseOrderTitle(card.name);
    if (!parsed) continue;

    const key = parsed.poNumber;
    const existing = byPo.get(key);
    if (existing) {
      existing.orderCount += 1;
      if (!existing.orderTitles.includes(parsed.customerText)) {
        existing.orderTitles.push(parsed.customerText);
      }
    } else {
      byPo.set(key, {
        displayName: poDisplayName(key),
        orderCount: 1,
        orderTitles: [parsed.customerText],
      });
    }
  }

  const dbByMatch = new Map(
    (dbCustomers ?? []).map((c) => [c.match_value.toLowerCase(), c])
  );

  const merged: AdminCustomer[] = [];

  for (const [poNumber, trello] of byPo) {
    const db = dbByMatch.get(poNumber.toLowerCase());
    merged.push({
      matchValue: poNumber,
      displayName: db?.display_name ?? trello.displayName,
      customerId: db?.customer_id ?? null,
      orderCount: trello.orderCount,
      orderTitles: trello.orderTitles,
      samplePos: [poNumber],
      allPos: [poNumber],
      hasAccount: !!db,
      hasPin: !!db?.pin_hash,
      createdAt: db?.created_at ?? null,
    });
    dbByMatch.delete(poNumber.toLowerCase());
  }

  for (const [, db] of dbByMatch) {
    merged.push({
      matchValue: db.match_value,
      displayName: db.display_name,
      customerId: db.customer_id,
      orderCount: 0,
      orderTitles: [],
      samplePos: [db.match_value],
      allPos: [db.match_value],
      hasAccount: true,
      hasPin: !!db.pin_hash,
      createdAt: db.created_at,
    });
  }

  return merged.sort((a, b) => b.orderCount - a.orderCount);
}

export async function generatePinForCustomer(
  matchValue: string
): Promise<PinGenerationResult> {
  const supabase = createSupabaseAdmin();
  const boardId = getBoardId();
  const poNumber = matchValue.trim();

  const customers = await listAdminCustomers();
  const target = customers.find((c) => c.matchValue === poNumber);
  if (!target) throw new Error("Customer not found");

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);
  const now = new Date().toISOString();
  const displayName = poDisplayName(poNumber);

  if (target.hasAccount && target.customerId) {
    const { error } = await supabase
      .from("customers")
      .update({
        pin_hash: pinHash,
        display_name: displayName,
        updated_at: now,
      })
      .eq("customer_id", target.customerId)
      .eq("board_id", boardId);

    if (error) throw new Error(error.message);

    return {
      matchValue: poNumber,
      customerId: target.customerId,
      displayName,
      pin,
    };
  }

  const customerId = portalIdFromPo(poNumber);
  const { data: existingId } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existingId) {
    throw new Error(`Portal ID ${customerId} already exists`);
  }

  const { error } = await supabase.from("customers").insert({
    customer_id: customerId,
    display_name: displayName,
    match_value: poNumber,
    board_id: boardId,
    pin_hash: pinHash,
    updated_at: now,
  });

  if (error) throw new Error(error.message);

  return { matchValue: poNumber, customerId, displayName, pin };
}

export async function bulkGeneratePins(): Promise<PinGenerationResult[]> {
  const customers = await listAdminCustomers();
  const withoutPin = customers.filter((c) => !c.hasPin && c.orderCount > 0);
  const results: PinGenerationResult[] = [];

  for (const customer of withoutPin) {
    const result = await generatePinForCustomer(customer.matchValue);
    results.push(result);
  }

  return results;
}
