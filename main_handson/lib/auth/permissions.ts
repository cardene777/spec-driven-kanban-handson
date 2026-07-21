// design/013_permissions.md § 権限判定の共通部品
// 判定順序: 認証 → 対象存在 → 権限（spec/000_shared_rules.md）
// 非メンバーは存在を漏らさないため not_found（404）、メンバーだが権限不足は forbidden（403）。
import { prisma } from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { unauthorized, forbidden, notFound } from "@/lib/errors";

export type BoardRole = "owner" | "member" | "viewer";

const RANK: Record<BoardRole, number> = { viewer: 0, member: 1, owner: 2 };

export type AccessResult =
  | { kind: "ok"; role: BoardRole; user: SessionUser; boardId: string }
  | { kind: "unauthorized" }
  | { kind: "not_found" }
  | { kind: "forbidden" };

export async function checkBoardAccess(
  boardId: string,
  minRole: BoardRole,
): Promise<AccessResult> {
  const user = await getSessionUser();
  if (!user) return { kind: "unauthorized" };

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true },
  });
  if (!board) return { kind: "not_found" };

  const membership = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
    select: { role: true },
  });
  // 非メンバーには存在を漏らさない
  if (!membership) return { kind: "not_found" };

  const role = membership.role as BoardRole;
  if (RANK[role] < RANK[minRole]) return { kind: "forbidden" };
  return { kind: "ok", role, user, boardId };
}

export async function checkListAccess(
  listId: string,
  minRole: BoardRole,
): Promise<AccessResult> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { boardId: true },
  });
  if (!list) {
    // 未認証を優先して返す（認証 → 対象存在 の順）
    const user = await getSessionUser();
    return user ? { kind: "not_found" } : { kind: "unauthorized" };
  }
  return checkBoardAccess(list.boardId, minRole);
}

export async function checkCardAccess(
  cardId: string,
  minRole: BoardRole,
): Promise<AccessResult> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { listId: true },
  });
  if (!card) {
    const user = await getSessionUser();
    return user ? { kind: "not_found" } : { kind: "unauthorized" };
  }
  return checkListAccess(card.listId, minRole);
}

// AccessResult を HTTP 応答へ写像する（ok 以外のときだけ Response を返す）
export function accessErrorResponse(
  result: AccessResult,
  notFoundMessage = "対象のリソースが見つかりません",
) {
  if (result.kind === "unauthorized") return unauthorized();
  if (result.kind === "not_found") return notFound(notFoundMessage);
  if (result.kind === "forbidden") return forbidden();
  return null;
}

export async function countOwners(boardId: string): Promise<number> {
  const owners = await prisma.boardMembership.findMany({
    where: { boardId, role: "owner" },
    select: { id: true },
  });
  return owners.length;
}
