// spec/001_boards.md § 画面: ボード詳細 / design/002_lists.md § UI 構造 / design/003_cards.md § UI 構造
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import BoardHeader from "@/components/boards/BoardHeader";
import ListCreateForm from "@/components/lists/ListCreateForm";
import ListColumn from "@/components/lists/ListColumn";
import CardDetailModal from "@/components/cards/CardDetailModal";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ card?: string }>;
};

export default async function BoardDetailPage({ params, searchParams }: PageProps) {
  const { boardId } = await params;
  const { card: cardParam } = await searchParams;
  const user = await getCurrentUserFromCookies();
  if (!user) redirect(`/login?returnTo=/boards/${boardId}`);

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return notFound();

  const membership = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });
  if (!membership) return notFound();

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      cards: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const canWrite =
    membership.role === "owner" || membership.role === "member";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-neutral-0">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <nav className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/" className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
              <span aria-hidden>←</span>
              ボード一覧
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="font-medium text-neutral-700">{board.title}</span>
          </nav>
          <BoardHeader board={board} canEdit={membership.role === "owner"} />
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              {membership.role}
            </span>
            <Link
              href={`/boards/${boardId}/members`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
            >
              メンバー / 招待の管理
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {canWrite ? (
          <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-0 p-4 shadow-sm">
            <ListCreateForm boardId={boardId} />
          </div>
        ) : null}

        <section className="flex gap-4 overflow-x-auto pb-4">
          {lists.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-neutral-300 bg-neutral-0 p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-700">まだリストがありません</p>
              <p className="mt-1 text-xs text-neutral-500">
                上のフォームから最初のリストを作成しましょう。
              </p>
            </div>
          ) : (
            lists.map((list) => (
              <ListColumn
                key={list.id}
                list={{
                  id: list.id,
                  boardId: list.boardId,
                  title: list.title,
                  order: list.order,
                }}
                cards={list.cards.map((c) => ({
                  id: c.id,
                  listId: c.listId,
                  title: c.title,
                  order: c.order,
                }))}
                canWrite={canWrite}
              />
            ))
          )}
        </section>
      </main>

      {cardParam ? <CardDetailModal cardId={cardParam} /> : null}
    </div>
  );
}
