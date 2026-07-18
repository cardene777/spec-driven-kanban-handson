// FR-002 (spec/02_list.md)
import Link from "next/link";
import { notFound } from "next/navigation";
import { boardRepository } from "@/lib/repository/board";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
import ListCreateForm from "./_components/ListCreateForm";
import ListColumn from "./_components/ListColumn";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function BoardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const board = await boardRepository.findById(id);
  if (!board) notFound();

  const lists = await listRepository.findByBoard(id);
  const listsWithCards = await Promise.all(
    lists.map(async (list) => ({
      list,
      cards: await cardRepository.findByList(list.id),
    })),
  );

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline">
            ← ボード一覧
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{board.title}</h1>
        </div>
        <ListCreateForm boardId={board.id} />
      </header>

      {listsWithCards.length === 0 ? (
        <p className="text-slate-500">
          まだリストがありません。「リスト作成」から追加できます。
        </p>
      ) : (
        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4">
          {listsWithCards.map(({ list, cards }) => (
            <ListColumn key={list.id} list={list} cards={cards} />
          ))}
        </div>
      )}
    </main>
  );
}
