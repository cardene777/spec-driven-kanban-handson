import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewListForm } from "./new-list-form";
import { NewCardForm } from "./new-card-form";

// 毎回最新の状態を表示する（キャッシュしない）
export const dynamic = "force-dynamic";

// Next.js 16 では動的ルートの params は Promise で渡される
type PageProps = { params: Promise<{ id: string }> };

export default async function BoardDetailPage({ params }: PageProps) {
  const { id } = await params;

  // URL のボード ID からボード情報とリスト一覧を取得する
  // リストは order の昇順、各リスト内のカードも order の昇順に並べる
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

  if (!board) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline"
        >
          ← ボード一覧へ
        </Link>
        <div className="mt-3 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{board.title}</h1>
          <NewListForm boardId={board.id} />
        </div>
      </div>

      {board.lists.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          まだリストがありません。「リスト作成」から追加してください。
        </p>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {board.lists.map((list) => (
            <li
              key={list.id}
              className="flex w-72 shrink-0 flex-col gap-3 rounded-md border border-black/10 bg-black/[.02] p-4 dark:border-white/15 dark:bg-white/[.03]"
            >
              <p className="font-medium">{list.title}</p>

              {list.cards.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {list.cards.map((card) => (
                    <li
                      key={card.id}
                      className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/[.06]"
                    >
                      <p className="font-medium">{card.title}</p>
                      {card.description && (
                        <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                          {card.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* リストの末尾に「カード追加」ボタン／フォーム */}
              <NewCardForm listId={list.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
