// spec/003_cards.md FR-001 / FR-004、spec/004_card_edit.md FR-003
import { prisma } from "@/lib/prisma";

const cardSelect = {
  id: true,
  title: true,
  description: true,
  order: true,
  listId: true,
  createdAt: true,
} as const;

export function findCardsByListId(listId: string) {
  return prisma.card.findMany({
    where: { listId },
    orderBy: { order: "asc" },
    select: cardSelect,
  });
}

export function findCardById(id: string) {
  return prisma.card.findUnique({
    where: { id },
    select: { id: true },
  });
}

export async function createCardInList(listId: string, title: string) {
  const maxOrder = await prisma.card.aggregate({
    where: { listId },
    _max: { order: true },
  });
  const nextOrder = maxOrder._max.order === null ? 0 : maxOrder._max.order + 1;
  return prisma.card.create({
    data: { listId, title, order: nextOrder, description: null },
    select: cardSelect,
  });
}

export function updateCardTitle(id: string, title: string) {
  return prisma.card.update({
    where: { id },
    data: { title },
    select: cardSelect,
  });
}
