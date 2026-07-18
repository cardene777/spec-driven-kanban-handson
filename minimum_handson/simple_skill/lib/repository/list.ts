// FR-001 / FR-003 (spec/02_list.md)
import { prisma } from "../prisma";

export const listRepository = {
  findByBoard(boardId: string) {
    return prisma.list.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
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
};
