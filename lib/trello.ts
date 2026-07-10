import "server-only";

import {
  resolveBoardStageConfig,
  getProgressPercent,
  stageDisplayName,
  type BoardStageConfig,
} from "./stages";
import { cardHasCustomer, getCustomerFromLabels } from "./customer-labels";
import { isOrderCard, parseOrderTitle } from "./parsers";
import { fetchOrderComments } from "./order-comments";

const API_BASE = "https://api.trello.com/1";

function trelloCredentials() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;

  if (!key || !token) {
    throw new Error("Missing Trello API key or token");
  }

  return { key, token };
}

function trelloOAuthHeaders() {
  const { key, token } = trelloCredentials();
  return {
    Authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`,
  };
}

async function trelloGet<T>(
  path: string,
  params: Record<string, string> = {},
  options: { revalidate?: number } = {}
): Promise<T> {
  const { key, token } = trelloCredentials();
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const revalidate = options.revalidate ?? 60;
  const res = await fetch(url, { next: { revalidate } });
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
  mimeType?: string | null;
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

export type TrelloBoardSummary = {
  id: string;
  ref: string;
  name: string;
  url: string;
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
    source: "customer" | "team";
  }[];
};

export function boardRef(board: { id: string; shortLink?: string | null }): string {
  return board.shortLink?.trim() || board.id;
}

export async function fetchMemberBoards(): Promise<TrelloBoardSummary[]> {
  const boards = await trelloGet<
    { id: string; name: string; shortLink?: string | null; url: string }[]
  >("/members/me/boards", {
    fields: "id,name,shortLink,url",
    filter: "open",
  });

  return boards
    .map((board) => ({
      id: board.id,
      ref: boardRef(board),
      name: board.name,
      url: board.url,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchBoardLists(
  boardId: string
): Promise<{ id: string; name: string }[]> {
  return trelloGet<{ id: string; name: string }[]>(`/boards/${boardId}/lists`, {
    fields: "id,name",
  });
}

function coverUrl(card: TrelloCard): string | null {
  const coverId = card.cover?.idAttachment;
  if (!coverId || !card.attachments?.length) return null;
  const att = card.attachments.find((a) => a.id === coverId);
  if (!att) return null;
  const preview = att.previews?.find((p) => p.width >= 360) ?? att.previews?.[0];
  return preview?.url ?? att.url;
}

function toSummary(card: TrelloCard, stageConfig: BoardStageConfig): OrderSummary | null {
  const parsed = parseOrderTitle(card.name);
  if (!parsed) return null;

  return {
    id: card.id,
    title: card.name,
    poNumber: parsed.poNumber,
    customerText: parsed.customerText,
    stageId: card.idList,
    stageName: stageDisplayName(card.idList, stageConfig),
    progress: getProgressPercent(card.idList, stageConfig),
    due: card.due,
    start: card.start,
    labels: card.labels ?? [],
    coverUrl: coverUrl(card),
    commentCount: card.badges?.comments ?? 0,
    attachmentCount: card.badges?.attachments ?? card.attachments?.length ?? 0,
    lastActivity: card.dateLastActivity,
  };
}

function isCustomerOrderCard(card: TrelloCard, customerName: string): boolean {
  return (
    isOrderCard(card.name) &&
    cardHasCustomer(card.labels ?? [], customerName)
  );
}

export async function fetchBoardCards(boardId: string): Promise<TrelloCard[]> {
  return trelloGet<TrelloCard[]>(`/boards/${boardId}/cards`, {
    fields: "name,desc,idList,labels,due,start,dateLastActivity,badges,cover",
    attachments: "true",
    attachment_fields: "url,name,date,previews,mimeType",
  });
}

export async function fetchCustomerOrders(
  customerName: string,
  boardId: string
): Promise<OrderSummary[]> {
  const [cards, stageConfig] = await Promise.all([
    fetchBoardCards(boardId),
    resolveBoardStageConfig(boardId),
  ]);

  return cards
    .filter((c) => isCustomerOrderCard(c, customerName))
    .map((c) => toSummary(c, stageConfig))
    .filter((o): o is OrderSummary => o !== null)
    .sort((a, b) => Number(b.poNumber) - Number(a.poNumber));
}

export async function fetchOrderDetail(
  cardId: string,
  customerName: string,
  boardId: string
): Promise<OrderDetail | null> {
  const card = await trelloGet<TrelloCard>(`/cards/${cardId}`, {
    fields: "name,desc,idList,labels,due,start,dateLastActivity,badges,cover",
    attachments: "true",
    attachment_fields: "url,name,date,previews,mimeType",
  });

  if (!isCustomerOrderCard(card, customerName)) {
    return null;
  }

  const stageConfig = await resolveBoardStageConfig(boardId);
  const summary = toSummary(card, stageConfig);
  if (!summary) return null;

  const comments = await fetchOrderComments(cardId, customerName);

  return {
    ...summary,
    description: card.desc ?? "",
    attachments: card.attachments ?? [],
    comments,
  };
}

export async function assertCustomerOwnsCard(
  cardId: string,
  customerName: string
): Promise<TrelloCard> {
  const card = await trelloGet<TrelloCard>(`/cards/${cardId}`, {
    fields: "name,labels",
  });

  if (!isCustomerOrderCard(card, customerName)) {
    throw new Error("Order not found");
  }

  return card;
}

export async function trelloGetCardSummary(
  cardId: string
): Promise<{ name: string } | null> {
  try {
    return await trelloGet<{ name: string }>(`/cards/${cardId}`, {
      fields: "name",
    });
  } catch {
    return null;
  }
}

export async function fetchTrelloCommentActions(cardId: string) {
  return trelloGet<TrelloAction[]>(
    `/cards/${cardId}/actions`,
    { filter: "commentCard", limit: "50" },
    { revalidate: 0 }
  );
}

export async function postOrderAttachment(
  cardId: string,
  customerName: string,
  boardId: string,
  file: File
): Promise<void> {
  await assertCustomerOwnsCard(cardId, customerName);

  const { key, token } = trelloCredentials();
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

export async function fetchAttachmentDownload(
  cardId: string,
  attachmentId: string,
  customerName: string
): Promise<{ body: ReadableStream<Uint8Array>; name: string; mimeType: string }> {
  await assertCustomerOwnsCard(cardId, customerName);

  const attachment = await trelloGet<{
    name: string;
    mimeType: string | null;
    url: string;
  }>(`/cards/${cardId}/attachments/${attachmentId}`, {
    fields: "name,mimeType,url",
  });

  if (!attachment.url) {
    throw new Error("Attachment has no download URL");
  }

  const res = await fetch(attachment.url, {
    headers: trelloOAuthHeaders(),
    redirect: "follow",
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download attachment: ${res.status}`);
  }

  const mimeType =
    attachment.mimeType ??
    res.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";

  return {
    body: res.body,
    name: attachment.name,
    mimeType,
  };
}

export { getCustomerFromLabels };
export { resolveBoardStageConfig, toStageProgressConfig } from "./stages";
