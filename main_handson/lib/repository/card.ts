// design/003_cards.md / design/004_card_movement_archive_restore.md § 実装方針
import { prisma } from "@/lib/prisma";
import { computeReorder, compactOrder } from "@/lib/ordering";
import { labelRepository } from "@/lib/repository/label";

const ACTIVE = { archivedAt: null, deletedAt: null } as const;

export type CardStatus = "active" | "archived" | "deleted";

// move / 状態遷移の結果（route が HTTP へマップする）
export type CardOpResult =
  | { kind: "ok"; card: unknown }
  | { kind: "not_found" }
  | { kind: "invalid"; reason: string };

export const cardRepository = {
  // 既定の一覧はアクティブなカードのみ（design/004 差分）
  findByList(listId: string) {
    return prisma.card.findMany({
      where: { listId, ...ACTIVE },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },
  findByStatus(listId: string, status: CardStatus) {
    if (status === "archived") {
      return prisma.card.findMany({
        where: { listId, archivedAt: { not: null } },
        orderBy: [{ archivedAt: "desc" }],
      });
    }
    if (status === "deleted") {
      return prisma.card.findMany({
        where: { listId, deletedAt: { not: null } },
        orderBy: [{ deletedAt: "desc" }],
      });
    }
    return prisma.card.findMany({
      where: { listId, ...ACTIVE },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },
  findById(id: string) {
    return prisma.card.findUnique({ where: { id } });
  },
  // spec/005_card_detail.md: card + labels + dueDate
  async findByIdWithDetail(id: string) {
    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) return null;
    const labels = await labelRepository.listForCard(id);
    return { ...card, labels };
  },
  // ボード詳細画面用: active カードに付与ラベルを含めて取得
  async findByListWithLabels(listId: string) {
    const cards = await prisma.card.findMany({
      where: { listId, ...ACTIVE },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { cardLabels: { include: { label: true } } },
    });
    return cards.map((c) => {
      const { cardLabels, ...rest } = c;
      return { ...rest, labels: cardLabels.map((cl) => cl.label) };
    });
  },
  async create(listId: string, title: string, description: string) {
    const last = await prisma.card.findFirst({
      where: { listId, ...ACTIVE },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;
    return prisma.card.create({ data: { listId, title, description, order } });
  },
  update(
    id: string,
    patch: {
      title?: string;
      description?: string;
      order?: number;
      dueDate?: Date | null;
    },
  ) {
    return prisma.card.update({ where: { id }, data: patch });
  },

  // spec/004: カード移動（同一/別リスト）。1 トランザクションでアクティブ集合を再採番。
  async move(
    cardId: string,
    sourceListId: string,
    targetListId: string,
    targetOrder: number,
  ): Promise<CardOpResult> {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card) return { kind: "not_found" as const };
      if (card.archivedAt !== null || card.deletedAt !== null) {
        return { kind: "invalid" as const, reason: "not_active" };
      }
      if (card.listId !== sourceListId) {
        return { kind: "invalid" as const, reason: "source_mismatch" };
      }
      const sourceList = await tx.list.findUnique({ where: { id: sourceListId } });
      if (!sourceList) return { kind: "not_found" as const };
      const targetList = await tx.list.findUnique({ where: { id: targetListId } });
      if (!targetList) return { kind: "not_found" as const };
      if (targetList.boardId !== sourceList.boardId) {
        return { kind: "invalid" as const, reason: "cross_board" };
      }

      if (sourceListId === targetListId) {
        const active = await tx.card.findMany({
          where: { listId: sourceListId, ...ACTIVE },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        const ids = active.map((c) => c.id);
        const withoutLen = ids.filter((id) => id !== cardId).length;
        if (targetOrder < 0 || targetOrder > withoutLen) {
          return { kind: "invalid" as const, reason: "order_range" };
        }
        for (const a of computeReorder(ids, cardId, targetOrder)) {
          await tx.card.update({ where: { id: a.id }, data: { order: a.order } });
        }
      } else {
        const sourceActive = await tx.card.findMany({
          where: { listId: sourceListId, ...ACTIVE },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        const targetActive = await tx.card.findMany({
          where: { listId: targetListId, ...ACTIVE },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });
        if (targetOrder < 0 || targetOrder > targetActive.length) {
          return { kind: "invalid" as const, reason: "order_range" };
        }
        const sourceIds = sourceActive.map((c) => c.id).filter((id) => id !== cardId);
        for (const a of compactOrder(sourceIds)) {
          await tx.card.update({ where: { id: a.id }, data: { order: a.order } });
        }
        const targetIds = targetActive.map((c) => c.id);
        targetIds.splice(targetOrder, 0, cardId);
        for (let i = 0; i < targetIds.length; i++) {
          const data: { order: number; listId?: string } = { order: i };
          if (targetIds[i] === cardId) data.listId = targetListId;
          await tx.card.update({ where: { id: targetIds[i] }, data });
        }
      }

      const updated = await tx.card.findUnique({ where: { id: cardId } });
      return { kind: "ok" as const, card: updated };
    });
  },

  // アーカイブ / ソフト削除（フラグ設定 + 元リスト active 詰め直し。反対状態は 422、同状態は冪等）
  async setState(
    cardId: string,
    field: "archivedAt" | "deletedAt",
  ): Promise<CardOpResult> {
    const opposite = field === "archivedAt" ? "deletedAt" : "archivedAt";
    const reason = field === "archivedAt" ? "deleted_state" : "archived_state";
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card) return { kind: "not_found" as const };
      if ((card as Record<string, unknown>)[opposite] !== null) {
        return { kind: "invalid" as const, reason };
      }
      if ((card as Record<string, unknown>)[field] !== null) {
        return { kind: "ok" as const, card }; // 冪等（タイムスタンプ不変）
      }
      await tx.card.update({ where: { id: cardId }, data: { [field]: new Date() } });
      const active = await tx.card.findMany({
        where: { listId: card.listId, ...ACTIVE },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      for (const a of compactOrder(active.map((c) => c.id))) {
        await tx.card.update({ where: { id: a.id }, data: { order: a.order } });
      }
      const updated = await tx.card.findUnique({ where: { id: cardId } });
      return { kind: "ok" as const, card: updated };
    });
  },

  // アーカイブ復元 / 削除復元（フラグ解除 + 末尾へ。同状態は冪等）
  async clearState(
    cardId: string,
    field: "archivedAt" | "deletedAt",
  ): Promise<CardOpResult> {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card) return { kind: "not_found" as const };
      if ((card as Record<string, unknown>)[field] === null) {
        return { kind: "ok" as const, card }; // 冪等
      }
      const active = await tx.card.findMany({
        where: { listId: card.listId, ...ACTIVE },
      });
      const order = active.length; // 末尾 index
      await tx.card.update({
        where: { id: cardId },
        data: { [field]: null, order },
      });
      const updated = await tx.card.findUnique({ where: { id: cardId } });
      return { kind: "ok" as const, card: updated };
    });
  },

  // 完全削除（deleted 状態のみ。物理削除）
  async purge(cardId: string): Promise<CardOpResult> {
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) return { kind: "not_found" };
    if (card.deletedAt === null) return { kind: "invalid", reason: "not_deleted" };
    await prisma.card.delete({ where: { id: cardId } });
    return { kind: "ok", card };
  },
};
