import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateBoardForm from "./CreateBoardForm";

// 常に最新の一覧を表示するためキャッシュを無効化する
export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">ボード一覧</h1>
        <CreateBoardForm />
      </div>

      {boards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
          ボードがまだありません。「新規ボード作成」から追加してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-gray-700"
              >
                <span className="font-medium">{board.title}</span>
                <time
                  dateTime={board.createdAt.toISOString()}
                  className="text-xs text-gray-500"
                >
                  {board.createdAt.toLocaleString("ja-JP")}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
