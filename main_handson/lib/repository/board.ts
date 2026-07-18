// design/001_boards.md § 実装方針
import { prisma } from "@/lib/prisma";

export const boardRepository = {
  listForUser(userId: string) {
    return prisma.board.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },
  findById(id: string) {
    return prisma.board.findUnique({ where: { id } });
  },
  async create(userId: string, title: string) {
    const last = await prisma.board.findFirst({
      where: { ownerId: userId },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;
    return prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: { title, order, ownerId: userId },
      });
      await tx.boardMembership.create({
        data: { boardId: board.id, userId, role: "owner" },
      });
      return board;
    });
  },
  updateTitle(id: string, title: string) {
    return prisma.board.update({ where: { id }, data: { title } });
  },
  delete(id: string) {
    return prisma.board.delete({ where: { id } });
  },
};
