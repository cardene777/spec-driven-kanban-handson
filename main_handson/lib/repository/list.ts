// design/002_lists.md / design/004_card_movement_archive_restore.md § 実装方針
import { prisma } from "@/lib/prisma";
import { computeReorder } from "@/lib/ordering";

export type ListOpResult =
  | { kind: "ok"; list: unknown }
  | { kind: "not_found" }
  | { kind: "invalid"; reason: string };

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
  update(id: string, patch: { title?: string; order?: number }) {
    return prisma.list.update({ where: { id }, data: patch });
  },
  delete(id: string) {
    return prisma.list.delete({ where: { id } });
  },

  // spec/004: リスト並べ替え（ボード内で 0 始まり再採番）
  async move(listId: string, targetOrder: number): Promise<ListOpResult> {
    return prisma.$transaction(async (tx) => {
      const list = await tx.list.findUnique({ where: { id: listId } });
      if (!list) return { kind: "not_found" as const };
      const lists = await tx.list.findMany({
        where: { boardId: list.boardId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      const ids = lists.map((l) => l.id);
      const withoutLen = ids.filter((id) => id !== listId).length;
      if (targetOrder < 0 || targetOrder > withoutLen) {
        return { kind: "invalid" as const, reason: "order_range" };
      }
      for (const a of computeReorder(ids, listId, targetOrder)) {
        await tx.list.update({ where: { id: a.id }, data: { order: a.order } });
      }
      const updated = await tx.list.findUnique({ where: { id: listId } });
      return { kind: "ok" as const, list: updated };
    });
  },
};
