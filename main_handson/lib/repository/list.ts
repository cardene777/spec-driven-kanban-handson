// design/002_lists.md § 実装方針
import { prisma } from "@/lib/prisma";

export const listRepository = {
  findByBoard(boardId: string) {
    return prisma.list.findMany({
      where: { boardId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },
  findById(id: string) {
    return prisma.list.findUnique({ where: { id } });
  },
  async create(boardId: string, title: string) {
    const last = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;
    return prisma.list.create({ data: { boardId, title, order } });
  },
  updateTitle(id: string, title: string) {
    return prisma.list.update({ where: { id }, data: { title } });
  },
  delete(id: string) {
    return prisma.list.delete({ where: { id } });
  },
};
