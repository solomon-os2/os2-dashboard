import { getStageForList, getProgressPercent, READY_FOR_SHIPPING_ID } from "./stages";
import { isOrderCard, orderMatchesPo, parseOrderTitle } from "./parsers";

const API_BASE = "https://api.trello.com/1";

function credentials() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const boardId = process.env.TRELLO_BOARD_ID;

  if (!key || !token || !boardId) {
    throw new Error("Missing Trello environment variables");
  }

  return { key, token, boardId };
}

async function trelloGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { key, token } = credentials();
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Trello ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

type TrelloLabel = { id: string; name: string; color: string | null };
type TrelloAttachment = {
  id: string;
  name: string;
  url: string;
  date: string;
  previews?: { url: string; width: number; height: number }[];
};
type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  idList: string;
  due: string | null;
  start: string | null;
  dateLastActivity: string;
  labels: TrelloLabel[];
  attachments?: TrelloAttachment[];
  badges?: { comments: number; attachments: number };
  cover?: { idAttachment?: string | null; color?: string | null };
};

type TrelloAction = {
  id: string;
  type: string;
  date: string;
  data: { text?: string };
  memberCreator?: { fullName: string; initials: string };
};

export type OrderSummary = {
  id: string;
  title: string;
  poNumber: string;
  customerText: string;
  stageId: string;
  stageName: string;
  progress: number;
  due: string | null;
  start: string | null;
  labels: TrelloLabel[];
  coverUrl: string | null;
  commentCount: number;
  attachmentCount: number;
  lastActivity: string;
};

export type OrderDetail = OrderSummary & {
  description: string;
  attachments: TrelloAttachment[];
  comments: {
    id: string;
    text: string;
    date: string;
    author: string;
    initials: string;
  }[];
};

function coverUrl(card: TrelloCard): string | null {
  const coverId = card.cover?.idAttachment;
  if (!coverId || !card.attachments?.length) return null;
  const att = card.attachments.find((a) => a.id === coverId);
  if (!att) return null;
  const preview = att.previews?.find((p) => p.width >= 360) ?? att.previews?.[0];
  return preview?.url ?? att.url;
}

function stageName(listId: string): string {
  if (listId === READY_FOR_SHIPPING_ID) return "Ready for Shipping";
  return getStageForList(listId)?.name ?? "In Progress";
}

function toSummary(card: TrelloCard): OrderSummary | null {
  const parsed = parseOrderTitle(card.name);
  if (!parsed) return null;

  return {
    id: card.id,
    title: card.name,
    poNumber: parsed.poNumber,
    customerText: parsed.customerText,
    stageId: card.idList,
    stageName: stageName(card.idList),
    progress: getProgressPercent(card.idList),
    due: card.due,
    start: card.start,
    labels: card.labels ?? [],
    coverUrl: coverUrl(card),
    commentCount: card.badges?.comments ?? 0,
    attachmentCount: card.badges?.attachments ?? card.attachments?.length ?? 0,
    lastActivity: card.dateLastActivity,
  };
}

export async function fetchBoardCards(): Promise<TrelloCard[]> {
  const { boardId } = credentials();
  return trelloGet<TrelloCard[]>(`/boards/${boardId}/cards`, {
    fields: "name,desc,idList,labels,due,start,dateLastActivity,badges,cover",
    attachments: "true",
    attachment_fields: "url,name,date,previews",
  });
}

export async function fetchCustomerOrders(poNumber: string): Promise<OrderSummary[]> {
  const cards = await fetchBoardCards();
  return cards
    .filter((c) => isOrderCard(c.name) && orderMatchesPo(poNumber, c.name))
    .map(toSummary)
    .filter((o): o is OrderSummary => o !== null)
    .sort((a, b) => Number(b.poNumber) - Number(a.poNumber));
}

export async function fetchOrderDetail(
  cardId: string,
  poNumber: string
): Promise<OrderDetail | null> {
  const card = await trelloGet<TrelloCard>(`/cards/${cardId}`, {
    fields: "name,desc,idList,labels,due,start,dateLastActivity,badges,cover",
    attachments: "true",
    attachment_fields: "url,name,date,previews",
  });

  if (!isOrderCard(card.name) || !orderMatchesPo(poNumber, card.name)) {
    return null;
  }

  const summary = toSummary(card);
  if (!summary) return null;

  const actions = await trelloGet<TrelloAction[]>(`/cards/${cardId}/actions`, {
    filter: "commentCard",
    limit: "50",
  });

  const comments = actions
    .filter((a) => a.data.text && !a.data.text.trimStart().startsWith("[INTERNAL]"))
    .map((a) => ({
      id: a.id,
      text: a.data.text!,
      date: a.date,
      author: a.memberCreator?.fullName ?? "Team",
      initials: a.memberCreator?.initials ?? "OS",
    }));

  return {
    ...summary,
    description: card.desc ?? "",
    attachments: card.attachments ?? [],
    comments,
  };
}

export async function postOrderComment(
  cardId: string,
  poNumber: string,
  text: string
): Promise<void> {
  const card = await trelloGet<{ name: string }>(`/cards/${cardId}`, {
    fields: "name",
  });

  if (!isOrderCard(card.name) || !orderMatchesPo(poNumber, card.name)) {
    throw new Error("Order not found");
  }

  const { key, token } = credentials();
  const url = new URL(`${API_BASE}/cards/${cardId}/actions/comments`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  url.searchParams.set("text", `[Customer]: ${text}`);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to post comment: ${await res.text()}`);
  }
}

export async function postOrderAttachment(
  cardId: string,
  poNumber: string,
  file: File
): Promise<void> {
  const card = await trelloGet<{ name: string }>(`/cards/${cardId}`, {
    fields: "name",
  });

  if (!isOrderCard(card.name) || !orderMatchesPo(poNumber, card.name)) {
    throw new Error("Order not found");
  }

  const { key, token } = credentials();
  const url = new URL(`${API_BASE}/cards/${cardId}/attachments`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  url.searchParams.set("name", file.name);

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Failed to upload: ${await res.text()}`);
  }
}
