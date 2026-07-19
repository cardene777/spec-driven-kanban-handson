import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewListForm } from "./new-list-form";
import { NewCardForm } from "./new-card-form";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = await prisma.board.findUnique({ where: { id } });
  const lists = await prisma.list.findMany({
    where: { boardId: id },
    orderBy: { order: "asc" },
    include: {
      cards: { orderBy: { order: "asc" } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← ボード一覧
      </Link>

      <h1 className="mb-6 mt-2 text-2xl font-bold">{board?.title}</h1>

      <div className="flex items-start gap-4 overflow-x-auto">
        {lists.map((list) => (
          <div
            key={list.id}
            className="w-64 shrink-0 rounded-lg bg-gray-100 p-3"
          >
            <h2 className="mb-2 font-medium">{list.title}</h2>

            <ul className="mb-2 space-y-2">
              {list.cards.map((card) => (
                <li
                  key={card.id}
                  className="rounded-md bg-white p-2 text-sm shadow-sm"
                >
                  {card.title}
                </li>
              ))}
            </ul>

            <NewCardForm listId={list.id} />
          </div>
        ))}

        <div className="w-64 shrink-0">
          <NewListForm boardId={id} />
        </div>
      </div>
    </main>
  );
}
