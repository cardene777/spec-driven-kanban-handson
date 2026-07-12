// spec/001_boards.md § 画面: ボード一覧 / design/001_boards.md § UI 構造
// design/011_auth.md § UI 構造 (未ログインは /login へ redirect、Cookie ベースの currentUser)
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import BoardCreateForm from "@/components/boards/BoardCreateForm";
import LogoutButton from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const memberships = await prisma.boardMembership.findMany({
    where: { userId: user.id },
    include: { board: true },
  });
  const boards = memberships
    .map((m) => m.board)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">ボード一覧</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>ログイン: {user.name} ({user.email})</span>
          <LogoutButton />
        </div>
      </header>

      <BoardCreateForm />

      <section className="mt-8">
        {boards.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
            まだボードがありません。 上のフォームから新規作成してください。
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/boards/${board.id}`}
                  className="block px-4 py-3 hover:bg-gray-50"
                >
                  <span className="font-medium">{board.title}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    order={board.order}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
