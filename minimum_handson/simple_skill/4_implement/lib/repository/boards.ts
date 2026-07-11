// spec/001_boards.md FR-001 / FR-004
import { prisma } from "@/lib/prisma";

export function findAllBoards() {
  return prisma.board.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });
}

export function createBoard(title: string) {
  return prisma.board.create({
    data: { title },
    select: { id: true, title: true, createdAt: true },
  });
}

export function findBoardById(id: string) {
  return prisma.board.findUnique({
    where: { id },
    select: { id: true, title: true, createdAt: true },
  });
}
