// spec/001_boards.md FR-002 (ボード一覧画面)
import { findAllBoards } from "@/lib/repository/boards";
import { BoardListView } from "./_components/BoardListView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const boards = await findAllBoards();
  const initial = boards.map((b) => ({
    id: b.id,
    title: b.title,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">ボード一覧</h1>
      <BoardListView initialBoards={initial} />
    </main>
  );
}
