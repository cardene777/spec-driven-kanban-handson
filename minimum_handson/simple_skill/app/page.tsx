import Link from "next/link";
import { listBoards } from "@/lib/repository/board";
import { NewBoardForm } from "./_components/new-board-form";

// 一覧は常に最新の状態を表示する
export const dynamic = "force-dynamic";

// spec/01_board.md FR-002
export default async function Home() {
  // FR-001: createdAt 降順
  const boards = await listBoards();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ボード一覧</h1>
        <NewBoardForm />
      </div>

      {boards.length === 0 ? (
        <p className="text-gray-500">まだボードがありません。「新規ボード作成」から追加してください。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              {/* FR-002: 各ボードカードから /boards/[id] へ遷移する */}
              <Link
                href={`/boards/${board.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <h2 className="truncate font-semibold">{board.title}</h2>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
