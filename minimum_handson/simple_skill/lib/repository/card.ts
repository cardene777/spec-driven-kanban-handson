import { prisma } from "@/lib/prisma";

// spec/03_card.md FR-001: 同一リスト内は order 昇順
export function listCards(listId: string) {
  return prisma.card.findMany({
    where: { listId },
    orderBy: { order: "asc" },
  });
}

// spec/03_card.md FR-003: order は既存件数（0始まり、末尾に追加）、description は null
export async function createCard(listId: string, title: string) {
  const order = await prisma.card.count({ where: { listId } });
  return prisma.card.create({
    data: { title, order, listId },
  });
}

// spec/04_card_edit.md FR-003 の存在チェックに使用
export function getCard(id: string) {
  return prisma.card.findUnique({
    where: { id },
  });
}

// spec/04_card_edit.md FR-003
export function updateCard(id: string, title: string) {
  return prisma.card.update({
    where: { id },
    data: { title },
  });
}
