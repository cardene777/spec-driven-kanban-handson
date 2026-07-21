// design/013_permissions.md § API設計
import { prisma } from "@/lib/prisma";
import type { BoardRole } from "@/lib/auth/permissions";

export const memberRepository = {
  async listByBoard(boardId: string) {
    const rows = await prisma.boardMembership.findMany({
      where: { boardId },
      orderBy: [{ createdAt: "asc" }],
    });
    const users = await prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, name: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const u = byId.get(r.userId);
      return {
        userId: r.userId,
        name: u?.name ?? "",
        email: u?.email ?? "",
        role: r.role as BoardRole,
      };
    });
  },
  find(boardId: string, userId: string) {
    return prisma.boardMembership.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
  },
  updateRole(boardId: string, userId: string, role: BoardRole) {
    return prisma.boardMembership.update({
      where: { boardId_userId: { boardId, userId } },
      data: { role },
    });
  },
  remove(boardId: string, userId: string) {
    return prisma.boardMembership.delete({
      where: { boardId_userId: { boardId, userId } },
    });
  },
};
