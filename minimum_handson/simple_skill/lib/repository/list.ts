// FR-201 / FR-203 / FR-204 / FR-205 リストのデータアクセス
import { prisma } from "@/lib/prisma";

// FR-201 / FR-204 同じボード内では order 昇順
export function listListsByBoard(boardId: string) {
  return prisma.list.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
  });
}

export function findList(id: string) {
  return prisma.list.findUnique({ where: { id } });
}

// FR-203 リスト作成。order は同じボード内に0件なら0、以後は最大 order + 1
// 採番と作成を同一トランザクションで行い、(boardId, order) の重複を避ける
export function createList(boardId: string, title: string) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.list.findFirst({
      where: { boardId },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;
    return tx.list.create({ data: { boardId, title, order } });
  });
}
