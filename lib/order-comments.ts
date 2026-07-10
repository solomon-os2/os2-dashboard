import "server-only";

import {
  fetchPortalMessages,
  mergeOrderComments,
  parseTrelloTeamComments,
} from "./portal-messages";
import { fetchTrelloCommentActions } from "./trello";

export async function fetchOrderComments(
  cardId: string,
  customerName: string
) {
  const [portal, actions] = await Promise.all([
    fetchPortalMessages(cardId, customerName),
    fetchTrelloCommentActions(cardId),
  ]);

  return mergeOrderComments(portal, parseTrelloTeamComments(actions));
}
