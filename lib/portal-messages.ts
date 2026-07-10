import "server-only";

import { createSupabaseAdmin } from "./supabase";
import { parseCommentForPortal, type PortalCommentSource } from "./comments";
import { assertCustomerOwnsCard, trelloGetCardSummary } from "./trello";
import { parseOrderTitle } from "./parsers";

export type PortalComment = {
  id: string;
  text: string;
  date: string;
  author: string;
  initials: string;
  source: PortalCommentSource;
};

type PortalMessageRow = {
  id: string;
  card_id: string;
  board_id: string;
  customer_name: string;
  body: string;
  created_at: string;
};

type TrelloCommentAction = {
  id: string;
  date: string;
  data: { text?: string };
  memberCreator?: { fullName: string; initials: string };
};

function rowToComment(row: PortalMessageRow): PortalComment {
  return {
    id: row.id,
    text: row.body,
    date: row.created_at,
    author: "Customer",
    initials: "CU",
    source: "customer",
  };
}

export async function fetchPortalMessages(
  cardId: string,
  customerName: string
): Promise<PortalComment[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("portal_messages")
    .select("*")
    .eq("card_id", cardId)
    .eq("customer_name", customerName)
    .order("created_at", { ascending: true });

  if (error) {
    if (
      error.message.includes("schema cache") ||
      error.message.includes("does not exist")
    ) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToComment);
}

export async function createPortalMessage(input: {
  cardId: string;
  boardId: string;
  customerName: string;
  displayName: string;
  body: string;
}): Promise<PortalComment> {
  await assertCustomerOwnsCard(input.cardId, input.customerName);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("portal_messages")
    .insert({
      card_id: input.cardId,
      board_id: input.boardId,
      customer_name: input.customerName,
      body: input.body.trim(),
    })
    .select("*")
    .single();

  if (error) {
    if (
      error.message.includes("schema cache") ||
      error.message.includes("does not exist")
    ) {
      throw new Error(
        "portal_messages table missing. Run: npm run db:setup"
      );
    }
    throw new Error(error.message);
  }

  const card = await trelloGetCardSummary(input.cardId);
  const parsed = card ? parseOrderTitle(card.name) : null;

  import("./email").then(({ notifyStaffOfCustomerMessage }) =>
    notifyStaffOfCustomerMessage({
      poNumber: parsed?.poNumber ?? "—",
      orderTitle: parsed?.customerText ?? card?.name ?? "Order",
      customerName: input.displayName,
      message: input.body.trim(),
      cardId: input.cardId,
      boardId: input.boardId,
    })
  ).catch(() => {});

  return rowToComment(data);
}

export function parseTrelloTeamComments(
  actions: TrelloCommentAction[]
): PortalComment[] {
  const comments: PortalComment[] = [];

  for (const a of actions) {
    if (!a.data.text) continue;
    const parsed = parseCommentForPortal(a.data.text);
    if (!parsed || parsed.source !== "team") continue;
    comments.push({
      id: a.id,
      text: parsed.body,
      date: a.date,
      author: a.memberCreator?.fullName ?? "OS2 Team",
      initials: a.memberCreator?.initials ?? "OS",
      source: "team",
    });
  }

  return comments;
}

export function mergeOrderComments(
  portal: PortalComment[],
  trelloTeam: PortalComment[]
): PortalComment[] {
  return [...portal, ...trelloTeam].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
