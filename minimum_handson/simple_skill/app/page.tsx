// FR-002 (spec/01_board.md)
import Link from "next/link";
import { boardRepository } from "@/lib/repository/board";
import BoardCreateForm from "./_components/BoardCreateForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await boardRepository.list();

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">ボード一覧</h1>
        <BoardCreateForm />
      </header>

      {boards.length === 0 ? (
        <p className="text-slate-500">
          まだボードがありません。「新規ボード作成」から作成できます。
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                className="block h-32 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow"
              >
                <p className="text-lg font-medium text-slate-900">
                  {board.title}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(board.createdAt).toLocaleString("ja-JP")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
