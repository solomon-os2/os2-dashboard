import { createSupabaseAdmin } from "./supabase";
import { getAdminBoardId } from "./board";
import { fetchBoardCards } from "./trello";
import { getCustomerFromLabels } from "./customer-labels";
import { parseOrderTitle, portalIdFromCustomer } from "./parsers";
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
  missingLabelCount?: number;
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
  const boardId = await getAdminBoardId();
  const [cards, supabase] = await Promise.all([
    fetchBoardCards(boardId),
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

  const byCustomer = new Map<
    string,
    { displayName: string; orderCount: number; orderTitles: string[]; allPos: string[] }
  >();
  let missingLabelCount = 0;

  for (const card of cards) {
    const parsed = parseOrderTitle(card.name);
    if (!parsed) continue;

    const customerName = getCustomerFromLabels(card.labels ?? []);
    if (!customerName) {
      missingLabelCount += 1;
      continue;
    }

    const key = customerName.toLowerCase();
    const existing = byCustomer.get(key);
    if (existing) {
      existing.orderCount += 1;
      if (!existing.orderTitles.includes(parsed.customerText)) {
        existing.orderTitles.push(parsed.customerText);
      }
      if (!existing.allPos.includes(parsed.poNumber)) {
        existing.allPos.push(parsed.poNumber);
      }
    } else {
      byCustomer.set(key, {
        displayName: customerName,
        orderCount: 1,
        orderTitles: [parsed.customerText],
        allPos: [parsed.poNumber],
      });
    }
  }

  const dbByMatch = new Map(
    (dbCustomers ?? []).map((c) => [c.match_value.toLowerCase(), c])
  );

  const merged: AdminCustomer[] = [];

  for (const [, trello] of byCustomer) {
    const db = dbByMatch.get(trello.displayName.toLowerCase());
    merged.push({
      matchValue: trello.displayName,
      displayName: db?.display_name ?? trello.displayName,
      customerId: db?.customer_id ?? null,
      orderCount: trello.orderCount,
      orderTitles: trello.orderTitles,
      samplePos: trello.allPos.slice(0, 3),
      allPos: [...trello.allPos].sort((a, b) => Number(a) - Number(b)),
      hasAccount: !!db,
      hasPin: !!db?.pin_hash,
      createdAt: db?.created_at ?? null,
    });
    dbByMatch.delete(trello.displayName.toLowerCase());
  }

  for (const [, db] of dbByMatch) {
    merged.push({
      matchValue: db.match_value,
      displayName: db.display_name,
      customerId: db.customer_id,
      orderCount: 0,
      orderTitles: [],
      samplePos: [],
      allPos: [],
      hasAccount: true,
      hasPin: !!db.pin_hash,
      createdAt: db.created_at,
    });
  }

  if (missingLabelCount > 0) {
    merged.push({
      matchValue: "__missing_label__",
      displayName: `Orders missing customer label (${missingLabelCount})`,
      customerId: null,
      orderCount: missingLabelCount,
      orderTitles: [],
      samplePos: [],
      allPos: [],
      hasAccount: false,
      hasPin: false,
      createdAt: null,
      missingLabelCount,
    });
  }

  return merged
    .filter((c) => c.matchValue !== "__missing_label__" || (c.missingLabelCount ?? 0) > 0)
    .sort((a, b) => {
      if (a.matchValue === "__missing_label__") return 1;
      if (b.matchValue === "__missing_label__") return -1;
      return b.orderCount - a.orderCount;
    });
}

export async function generatePinForCustomer(
  matchValue: string
): Promise<PinGenerationResult> {
  if (matchValue === "__missing_label__") {
    throw new Error("Cannot generate PIN for orders missing a customer label");
  }

  const supabase = createSupabaseAdmin();
  const boardId = await getAdminBoardId();
  const customerName = matchValue.trim();

  const customers = await listAdminCustomers();
  const target = customers.find(
    (c) => c.matchValue.toLowerCase() === customerName.toLowerCase()
  );
  if (!target) throw new Error("Customer not found");

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);
  const now = new Date().toISOString();
  const displayName = target.displayName;

  if (target.hasAccount && target.customerId) {
    const { error } = await supabase
      .from("customers")
      .update({
        pin_hash: pinHash,
        display_name: displayName,
        match_value: target.matchValue,
        updated_at: now,
      })
      .eq("customer_id", target.customerId)
      .eq("board_id", boardId);

    if (error) throw new Error(error.message);

    return {
      matchValue: target.matchValue,
      customerId: target.customerId,
      displayName,
      pin,
    };
  }

  const customerId = portalIdFromCustomer(displayName);

  const { error } = await supabase.from("customers").insert({
    customer_id: customerId,
    display_name: displayName,
    match_value: target.matchValue,
    board_id: boardId,
    pin_hash: pinHash,
    updated_at: now,
  });

  if (error) throw new Error(error.message);

  return { matchValue: target.matchValue, customerId, displayName, pin };
}

export async function bulkGeneratePins(): Promise<PinGenerationResult[]> {
  const customers = await listAdminCustomers();
  const withoutPin = customers.filter(
    (c) => !c.hasPin && c.orderCount > 0 && c.matchValue !== "__missing_label__"
  );
  const results: PinGenerationResult[] = [];

  for (const customer of withoutPin) {
    const result = await generatePinForCustomer(customer.matchValue);
    results.push(result);
  }

  return results;
}
