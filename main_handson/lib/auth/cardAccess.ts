// design/003_cards.md § 補助クエリ = listId → boardId 解決 SSOT
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/http/errors";

export async function resolveBoardFromList(
  listId: string,
): Promise<{ id: string; boardId: string }> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, boardId: true },
  });
  if (!list) throw new NotFoundError();
  return list;
}

export async function resolveBoardFromCard(cardId: string): Promise<{
  id: string;
  listId: string;
  order: number;
  boardId: string;
}> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      listId: true,
      order: true,
      list: { select: { boardId: true } },
    },
  });
  if (!card) throw new NotFoundError();
  return {
    id: card.id,
    listId: card.listId,
    order: card.order,
    boardId: card.list.boardId,
  };
}
