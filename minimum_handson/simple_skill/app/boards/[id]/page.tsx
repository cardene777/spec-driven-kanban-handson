import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoard } from "@/lib/repository/board";
import { listLists } from "@/lib/repository/list";
import { listCards } from "@/lib/repository/card";
import { NewListForm } from "./_components/new-list-form";
import { AddCardForm } from "./_components/add-card-form";
import { CardItem } from "./_components/card-item";

// 詳細は常に最新の状態を表示する
export const dynamic = "force-dynamic";

// spec/02_list.md FR-002
export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const board = await getBoard(id);
  if (!board) notFound();

  // FR-001: リストは order 昇順
  const lists = await listLists(id);
  // spec/03_card.md FR-002: 各リスト内のカードは order 昇順
  const listsWithCards = await Promise.all(
    lists.map(async (list) => ({
      ...list,
      cards: await listCards(list.id),
    })),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← ボード一覧へ
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{board.title}</h1>
        <NewListForm boardId={board.id} />
      </div>

      {listsWithCards.length === 0 ? (
        <p className="text-gray-500">まだリストがありません。「リスト作成」から追加してください。</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {listsWithCards.map((list) => (
            <section
              key={list.id}
              className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-200 p-3"
            >
              <h2 className="mb-3 px-1 font-semibold">{list.title}</h2>

              <ul className="flex flex-col gap-2">
                {list.cards.map((card) => (
                  <li key={card.id}>
                    <CardItem card={{ id: card.id, title: card.title }} />
                  </li>
                ))}
              </ul>

              <div className="mt-2">
                <AddCardForm listId={list.id} />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
