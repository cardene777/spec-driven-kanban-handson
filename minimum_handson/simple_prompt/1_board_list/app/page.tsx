import { prisma } from "@/lib/prisma";
import NewBoardForm from "./_components/NewBoardForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">ボード一覧</h1>
        <span className="text-sm text-zinc-500">{boards.length} 件</span>
      </header>

      <NewBoardForm />

      {boards.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
          まだボードがありません。上のボタンから作成してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-base font-medium text-zinc-900">
                {board.title}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(board.createdAt).toLocaleString("ja-JP")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
