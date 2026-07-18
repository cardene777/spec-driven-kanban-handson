// design/003_cards.md § 実装方針
import { prisma } from "@/lib/prisma";

export const cardRepository = {
  findByList(listId: string) {
    return prisma.card.findMany({
      where: { listId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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
    return prisma.card.create({
      data: { listId, title, description: "", order },
    });
  },
  update(id: string, patch: { title?: string; description?: string }) {
    return prisma.card.update({ where: { id }, data: patch });
  },
  delete(id: string) {
    return prisma.card.delete({ where: { id } });
  },
};
