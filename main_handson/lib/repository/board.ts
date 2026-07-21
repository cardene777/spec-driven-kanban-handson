// design/001_boards.md / design/013_permissions.md § 実装方針
import { prisma } from "@/lib/prisma";

export const boardRepository = {
  // spec/001: 認証ユーザーがメンバーであるボードのみを返す
  listForUser(userId: string) {
    return prisma.board.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },
  findById(id: string) {
    return prisma.board.findUnique({ where: { id } });
  },
  // spec/001: 作成者を owner とする BoardMembership を同一トランザクションで作成する
  async create(userId: string, title: string) {
    const last = await prisma.board.findFirst({ orderBy: { order: "desc" } });
    const order = last ? last.order + 1 : 0;
    return prisma.$transaction(async (tx) => {
      const board = await tx.board.create({ data: { title, order } });
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
    // 配下の List/Card/Label/BoardMembership/Invite は onDelete: Cascade で削除される
    return prisma.board.delete({ where: { id } });
  },
};
