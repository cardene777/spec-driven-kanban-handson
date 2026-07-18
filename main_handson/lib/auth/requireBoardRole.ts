// design/001_boards.md § 権限チェックの配置
// 「認証 → 対象存在 → 権限 → 入力検証」の順で判定するためのヘルパー
import { prisma } from "@/lib/prisma";

export type BoardRole = "owner" | "member" | "viewer";

const ROLE_RANK: Record<BoardRole, number> = { viewer: 0, member: 1, owner: 2 };

export type BoardAccessResult =
  | { kind: "ok"; role: BoardRole }
  | { kind: "not_found" }
  | { kind: "forbidden" };

export async function checkBoardAccess(
  userId: string,
  boardId: string,
  minRole: BoardRole,
): Promise<BoardAccessResult> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true },
  });
  if (!board) return { kind: "not_found" };

  const membership = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { role: true },
  });
  if (!membership) return { kind: "not_found" };

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    return { kind: "forbidden" };
  }
  return { kind: "ok", role: membership.role };
}
