import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewListForm from "@/app/_components/NewListForm";
import NewCardForm from "@/app/_components/NewCardForm";
import CardTitle from "@/app/_components/CardTitle";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardDetailPage({ params }: PageProps) {
  const { id } = await params;

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      lists: {
        orderBy: { order: "asc" },
        include: {
          cards: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!board) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="self-start text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← ボード一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {board.title}
          </h1>
          <span className="text-sm text-zinc-500">
            {board.lists.length} リスト
          </span>
        </div>
      </header>

      <NewListForm boardId={board.id} />

      {board.lists.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
          まだリストがありません。上のボタンから作成してください。
        </p>
      ) : (
        <ul className="flex flex-wrap items-start gap-4">
          {board.lists.map((list) => (
            <li
              key={list.id}
              className="flex w-64 flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 shadow-sm"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-base font-medium text-zinc-900">
                  {list.title}
                </p>
                <span className="text-xs text-zinc-500">
                  {list.cards.length} 枚
                </span>
              </div>
              {list.cards.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {list.cards.map((card) => (
                    <li
                      key={card.id}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <CardTitle cardId={card.id} initialTitle={card.title} />
                      {card.description && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">
                          {card.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <NewCardForm listId={list.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
