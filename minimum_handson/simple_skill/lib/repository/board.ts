import { prisma } from "@/lib/prisma";

// spec/01_board.md FR-001: createdAt 降順
export function listBoards() {
  return prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// spec/01_board.md FR-003
export function createBoard(title: string) {
  return prisma.board.create({
    data: { title },
  });
}

// spec/02_list.md FR-001/FR-003 の存在チェックに使用
export function getBoard(id: string) {
  return prisma.board.findUnique({
    where: { id },
  });
}
