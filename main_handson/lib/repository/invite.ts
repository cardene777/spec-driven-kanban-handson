// design/012_member_invite.md § API設計
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth/token";
import type { BoardRole } from "@/lib/auth/permissions";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日
export type InviteRole = Extract<BoardRole, "member" | "viewer">;

export function inviteUrl(token: string): string {
  return `/invites/${token}`;
}

export function isExpired(expiresAt: Date | string): boolean {
  return new Date() >= new Date(expiresAt);
}

export const inviteRepository = {
  listByBoard(boardId: string) {
    return prisma.invite.findMany({
      where: { boardId },
      orderBy: [{ createdAt: "desc" }],
    });
  },
  findById(id: string) {
    return prisma.invite.findUnique({ where: { id } });
  },
  findByToken(token: string) {
    return prisma.invite.findUnique({ where: { token } });
  },
  // 同一ボード・同一 email の pending は 1 件（アプリ層で検査）
  async findPendingByEmail(boardId: string, email: string) {
    const rows = await prisma.invite.findMany({
      where: { boardId, email, status: "pending" },
    });
    return rows[0] ?? null;
  },
  create(boardId: string, email: string, role: InviteRole, invitedByUserId: string) {
    return prisma.invite.create({
      data: {
        boardId,
        email,
        role,
        token: generateToken(),
        status: "pending",
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedByUserId,
      },
    });
  },
  // 再送: token を上書きして旧 token を無効化し、期限を更新する
  resend(id: string) {
    return prisma.invite.update({
      where: { id },
      data: {
        token: generateToken(),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  },
  revoke(id: string) {
    return prisma.invite.update({ where: { id }, data: { status: "revoked" } });
  },
  // 承認: BoardMembership 作成と Invite 更新を同一トランザクションで行う
  accept(inviteId: string, boardId: string, userId: string, role: BoardRole) {
    return prisma.$transaction(async (tx) => {
      await tx.boardMembership.create({ data: { boardId, userId, role } });
      return tx.invite.update({ where: { id: inviteId }, data: { status: "accepted" } });
    });
  },
};
