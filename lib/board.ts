import { getSession } from "./auth";
import { fetchMemberBoards, type TrelloBoardSummary } from "./trello";

export function pickDefaultBoard(boards: TrelloBoardSummary[]): string {
  if (boards.length === 0) {
    throw new Error("No Trello boards available for this token");
  }

  const os2Board = boards.find((b) => /os2/i.test(b.name));
  if (os2Board) return os2Board.ref;

  const testBoard = boards.find((b) => /test/i.test(b.name));
  if (testBoard) return testBoard.ref;

  return boards[0].ref;
}

export function findBoardRef(
  boards: TrelloBoardSummary[],
  ref: string
): TrelloBoardSummary | undefined {
  const normalized = ref.trim();
  return boards.find((b) => b.ref === normalized || b.id === normalized);
}

export async function getAdminBoardContext() {
  const boards = await fetchMemberBoards();
  const session = await getSession();
  const selectedRef =
    session.isAdmin && session.adminBoardId
      ? session.adminBoardId
      : pickDefaultBoard(boards);

  const selected =
    findBoardRef(boards, selectedRef) ??
    boards.find((b) => b.ref === pickDefaultBoard(boards));

  const boardId = selected?.ref ?? pickDefaultBoard(boards);

  return {
    boards,
    boardId,
    boardName: selected?.name ?? boardId,
  };
}

export async function getAdminBoardId(): Promise<string> {
  const { boardId } = await getAdminBoardContext();
  return boardId;
}
