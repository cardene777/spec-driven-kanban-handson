import { prisma } from "@/lib/prisma";

// spec/02_list.md FR-001: 同一ボード内は order 昇順
export function listLists(boardId: string) {
  return prisma.list.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
  });
}

// spec/02_list.md FR-003: order は既存件数（0始まり、末尾に追加）
export async function createList(boardId: string, title: string) {
  const order = await prisma.list.count({ where: { boardId } });
  return prisma.list.create({
    data: { title, order, boardId },
  });
}

// spec/03_card.md の存在チェックに使用
export function getList(id: string) {
  return prisma.list.findUnique({
    where: { id },
  });
}
