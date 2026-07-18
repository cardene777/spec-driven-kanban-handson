// FR-001 / FR-003 (spec/03_card.md), FR-003 (spec/04_card_edit.md)
import { prisma } from "../prisma";

export const cardRepository = {
  findByList(listId: string) {
    return prisma.card.findMany({
      where: { listId },
      orderBy: { order: "asc" },
    });
  },
  findById(id: string) {
    return prisma.card.findUnique({ where: { id } });
  },
  async create(listId: string, title: string) {
    const last = await prisma.card.findFirst({
      where: { listId },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;
    return prisma.card.create({ data: { listId, title, order } });
  },
  updateTitle(id: string, title: string) {
    return prisma.card.update({ where: { id }, data: { title } });
  },
};
