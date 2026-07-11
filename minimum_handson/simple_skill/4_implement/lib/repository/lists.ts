// spec/002_lists.md FR-002 / FR-004、FR-004 order 採番 (005_shared_rules.md)
import { prisma } from "@/lib/prisma";

export function findListsByBoardId(boardId: string) {
  return prisma.list.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      order: true,
      boardId: true,
      createdAt: true,
    },
  });
}

export function findListById(id: string) {
  return prisma.list.findUnique({
    where: { id },
    select: { id: true, boardId: true },
  });
}

export async function createListInBoard(boardId: string, title: string) {
  const maxOrder = await prisma.list.aggregate({
    where: { boardId },
    _max: { order: true },
  });
  const nextOrder = maxOrder._max.order === null ? 0 : maxOrder._max.order + 1;
  return prisma.list.create({
    data: { boardId, title, order: nextOrder },
    select: {
      id: true,
      title: true,
      order: true,
      boardId: true,
      createdAt: true,
    },
  });
}
