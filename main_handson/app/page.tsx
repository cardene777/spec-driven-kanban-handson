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

  const initial = user.name.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-neutral-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-neutral-0 shadow-sm">
              SK
            </div>
            <div className="text-base font-semibold tracking-tight text-neutral-900">
              Simple Kanban
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                {initial}
              </div>
              <div className="text-sm text-neutral-700">
                <div className="font-medium leading-tight">{user.name}</div>
                <div className="text-xs leading-tight text-neutral-500">{user.email}</div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            ボード一覧
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            自分が参加しているボードを表示します。 新規ボードを作るとオーナー権限で追加されます。
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <div className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
            新しいボードを作成
          </div>
          <BoardCreateForm />
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              あなたのボード ({boards.length})
            </h2>
          </div>
          {boards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-0 p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M8 4v16M16 4v16" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-700">まだボードがありません</p>
              <p className="mt-1 text-xs text-neutral-500">
                上のフォームから最初のボードを作成しましょう。
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/boards/${board.id}`}
                    className="group block rounded-xl border border-neutral-200 bg-neutral-0 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M8 4v16M16 4v16" />
                      </svg>
                    </div>
                    <div className="font-medium text-neutral-900 group-hover:text-primary-700">
                      {board.title}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {new Date(board.createdAt).toLocaleDateString("ja-JP")} 作成
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
