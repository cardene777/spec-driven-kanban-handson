// spec/002_lists.md FR-001、spec/003_cards.md FR-002
import { notFound } from "next/navigation";
import Link from "next/link";
import { findBoardById } from "@/lib/repository/boards";
import { findListsByBoardId } from "@/lib/repository/lists";
import { findCardsByListId } from "@/lib/repository/cards";
import { BoardDetailView } from "./_components/BoardDetailView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function BoardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const board = await findBoardById(id);
  if (!board) notFound();

  const lists = await findListsByBoardId(id);
  const listsWithCards = await Promise.all(
    lists.map(async (l) => {
      const cards = await findCardsByListId(l.id);
      return {
        id: l.id,
        title: l.title,
        order: l.order,
        boardId: l.boardId,
        createdAt: l.createdAt.toISOString(),
        cards: cards.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          order: c.order,
          listId: c.listId,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-full px-6 py-10">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← ボード一覧へ
        </Link>
        <h1 className="text-2xl font-semibold">{board.title}</h1>
      </div>
      <BoardDetailView boardId={board.id} initialLists={listsWithCards} />
    </main>
  );
}
