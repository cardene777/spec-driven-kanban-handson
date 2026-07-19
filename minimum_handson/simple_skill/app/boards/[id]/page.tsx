// FR-001 / FR-003 ボード詳細画面
// repository から対象のボード・リスト・カードを取得して初期描画する
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBoardDetail } from "@/lib/repository/board";
import { BoardDetail } from "@/app/boards/[id]/_components/BoardDetail";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = await getBoardDetail(id);
  if (!board) notFound();

  // リスト・カードは order 昇順で取得済み（repository 側で指定）
  const initialLists = board.lists.map((list) => ({
    id: list.id,
    title: list.title,
    order: list.order,
    cards: list.cards.map((card) => ({
      id: card.id,
      title: card.title,
      order: card.order,
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← ボード一覧へ
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold break-words">{board.title}</h1>
      <BoardDetail boardId={board.id} initialLists={initialLists} />
    </main>
  );
}
