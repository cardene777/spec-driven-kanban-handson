// design/010_comment.md § データモデル > 補助クエリ SSOT
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/http/errors";

export async function resolveBoardFromComment(commentId: string): Promise<{
  id: string;
  cardId: string;
  authorId: string;
  boardId: string;
}> {
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      cardId: true,
      authorId: true,
      card: { select: { list: { select: { boardId: true } } } },
    },
  });
  if (!c) throw new NotFoundError();
  return {
    id: c.id,
    cardId: c.cardId,
    authorId: c.authorId,
    boardId: c.card.list.boardId,
  };
}
