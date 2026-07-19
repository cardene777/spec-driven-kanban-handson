// FR-101 / FR-103 / FR-104 / FR-105 ボードのデータアクセス
import { prisma } from "@/lib/prisma";

// FR-101 / FR-104 一覧は createdAt の降順
export function listBoards() {
  return prisma.board.findMany({ orderBy: { createdAt: "desc" } });
}

// FR-103 / FR-105 ボード作成（title は検証済みのトリム後の値）
export function createBoard(title: string) {
  return prisma.board.create({ data: { title } });
}

export function findBoard(id: string) {
  return prisma.board.findUnique({ where: { id } });
}

// FR-003 ボード詳細画面の初期描画用に、ボード・リスト・カードをまとめて取得する
// リストは order 昇順、各リスト内のカードも order 昇順
export function getBoardDetail(id: string) {
  return prisma.board.findUnique({
    where: { id },
    include: {
      lists: {
        orderBy: { order: "asc" },
        include: { cards: { orderBy: { order: "asc" } } },
      },
    },
  });
}
