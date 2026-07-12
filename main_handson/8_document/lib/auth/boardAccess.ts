// design/001_boards.md § 認証・認可の共通ユーティリティ SSOT
// assertBoardAccess は「Board 存在 → membership 取得 → role 判定」 の 3 段。
// 未存在 / 未参加は NotFoundError、 権限不足のみ ForbiddenError。
import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/http/errors";
import type { Board, Role } from "@prisma/client";

const roleRank: Record<Role, number> = {
  viewer: 0,
  member: 1,
  owner: 2,
};

export async function getBoardRole(
  userId: string,
  boardId: string,
): Promise<Role | null> {
  const m = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

export async function assertBoardAccess(
  userId: string,
  boardId: string,
  requiredRole: Role,
): Promise<{ board: Board; role: Role }> {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) throw new NotFoundError();
  const role = await getBoardRole(userId, boardId);
  if (!role) throw new NotFoundError();
  if (roleRank[role] < roleRank[requiredRole]) throw new ForbiddenError();
  return { board, role };
}
