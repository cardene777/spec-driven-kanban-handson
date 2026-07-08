import { prisma } from "@/lib/prisma";
import { NewBoardForm } from "./new-board-form";

// 毎回最新のボード一覧を表示する（キャッシュしない）
export const dynamic = "force-dynamic";

export default async function Home() {
  // 一覧は createdAt の降順で表示する
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">ボード一覧</h1>
        <NewBoardForm />
      </div>

      {boards.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          まだボードがありません。「新規ボード作成」から作成してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="rounded-md border border-black/10 px-4 py-3 dark:border-white/15"
            >
              <p className="font-medium">{board.title}</p>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                {board.createdAt.toLocaleString("ja-JP")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
