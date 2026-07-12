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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-4 text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          ← ボード一覧
        </Link>
      </nav>

      <BoardHeader board={board} canEdit={membership.role === "owner"} />

      <div className="mt-4">
        <Link
          href={`/boards/${boardId}/members`}
          className="text-sm text-blue-600 hover:underline"
        >
          メンバー / 招待の管理へ →
        </Link>
      </div>

      <div className="mt-6">
        <ListCreateForm boardId={boardId} />
      </div>

      <section className="mt-6 flex gap-4 overflow-x-auto pb-4">
        {lists.length === 0 ? (
          <div className="w-full rounded border border-dashed border-gray-300 p-8 text-center text-gray-500">
            まだリストがありません。 上のフォームから新規作成してください。
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
              canWrite={
                membership.role === "owner" || membership.role === "member"
              }
            />
          ))
        )}
      </section>

      {cardParam ? <CardDetailModal cardId={cardParam} /> : null}
    </main>
  );
}
