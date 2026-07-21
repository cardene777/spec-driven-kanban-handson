// design/006_label.md § 実装方針
import { prisma } from "@/lib/prisma";
import type { LabelColor } from "@/lib/labelColors";

export const labelRepository = {
  listByBoard(boardId: string) {
    return prisma.label.findMany({
      where: { boardId },
      orderBy: [{ createdAt: "asc" }],
    });
  },
  findById(id: string) {
    return prisma.label.findUnique({ where: { id } });
  },
  create(boardId: string, name: string, color: LabelColor) {
    return prisma.label.create({ data: { boardId, name, color } });
  },
  update(id: string, patch: { name?: string; color?: LabelColor }) {
    return prisma.label.update({ where: { id }, data: patch });
  },
  delete(id: string) {
    return prisma.label.delete({ where: { id } });
  },

  // 付与済みラベル（Label[]）
  async listForCard(cardId: string) {
    const links = await prisma.cardLabel.findMany({ where: { cardId } });
    const ids = links.map((l) => l.labelId);
    if (ids.length === 0) return [];
    return prisma.label.findMany({
      where: { id: { in: ids } },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  // 付与（冪等）: 既に付与済みなら作らない
  async assign(cardId: string, labelId: string) {
    const existing = await prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    });
    if (existing) return { created: false, link: existing };
    const link = await prisma.cardLabel.create({ data: { cardId, labelId } });
    return { created: true, link };
  },

  // 解除（冪等）
  async unassign(cardId: string, labelId: string) {
    await prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
  },
};
