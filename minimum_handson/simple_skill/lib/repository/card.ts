// FR-301 / FR-303 / FR-304 / FR-305 / FR-403 カードのデータアクセス
import { prisma } from "@/lib/prisma";

// FR-301 / FR-304 同じリスト内では order 昇順
export function listCardsByList(listId: string) {
  return prisma.card.findMany({
    where: { listId },
    orderBy: { order: "asc" },
  });
}

export function findCard(id: string) {
  return prisma.card.findUnique({ where: { id } });
}

// FR-303 カード作成。order は同じリスト内に0件なら0、以後は最大 order + 1
// 採番と作成を同一トランザクションで行い、(listId, order) の重複を避ける
export function createCard(listId: string, title: string) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.card.findFirst({
      where: { listId },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;
    return tx.card.create({ data: { listId, title, order } });
  });
}

// FR-403 カードタイトル更新（title は検証済みのトリム後の値、order は変更しない）
export function updateCardTitle(id: string, title: string) {
  return prisma.card.update({ where: { id }, data: { title } });
}
