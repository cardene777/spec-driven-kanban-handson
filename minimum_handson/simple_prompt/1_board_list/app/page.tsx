import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewBoardForm } from "./new-board-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">ボード一覧</h1>

      <NewBoardForm />

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {boards.map((board) => (
          <li key={board.id}>
            <Link
              href={`/boards/${board.id}`}
              className="block rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50"
            >
              <span className="font-medium">{board.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
