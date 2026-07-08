import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreateListForm from "./CreateListForm";
import AddCardForm from "./AddCardForm";

// 常に最新の状態を表示するためキャッシュを無効化する
export const dynamic = "force-dynamic";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ボード・リスト一覧・各リストのカード一覧（いずれもorderの昇順）をまとめて取得する
  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      lists: {
        orderBy: { order: "asc" },
        include: {
          cards: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  // 存在しないボードIDの場合は404ページを表示する
  if (!board) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← ボード一覧へ
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{board.title}</h1>
        <CreateListForm boardId={board.id} />
      </div>

      {board.lists.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
          リストがまだありません。「リスト作成」から追加してください。
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.lists.map((list) => (
            <div
              key={list.id}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="px-1 py-1 text-sm font-semibold">{list.title}</h2>

              {list.cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900"
                >
                  <p className="font-medium">{card.title}</p>
                  {card.description && (
                    <p className="mt-1 text-xs text-gray-500">
                      {card.description}
                    </p>
                  )}
                </div>
              ))}

              {/* リストの末尾に「カード追加」 */}
              <AddCardForm listId={list.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
