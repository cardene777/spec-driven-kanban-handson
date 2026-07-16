// spec/001_boards.md § 画面: ボード詳細 / design/002_lists.md § UI 構造 / design/003_cards.md § UI 構造
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import AppShell from "@/components/layout/AppShell";
import BoardHeader from "@/components/boards/BoardHeader";
import ListCreateForm from "@/components/lists/ListCreateForm";
import BoardWorkspace from "@/components/boards/BoardWorkspace";
import BoardLabelsPanel from "@/components/labels/BoardLabelsPanel";
import CardDetailModal from "@/components/cards/CardDetailModal";
import { toDateOnly } from "@/lib/dueDate/serialize";
import type { Label } from "@/lib/labels/colors";

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

  const memberships = await prisma.boardMembership.findMany({
    where: { userId: user.id },
    include: { board: true },
  });
  const sidebarBoards = memberships
    .map((m) => m.board)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  // 担当者候補 = 対象ボードの viewer 以上のメンバー全員 (design/009_assignee.md § 担当者候補)
  const boardMembers = await prisma.boardMembership.findMany({
    where: { boardId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const assigneeCandidates = boardMembers.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
  }));

  const boardLabelRecords = await prisma.label.findMany({
    where: { boardId },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
  // Prisma DateTime を API と同じ YYYY-MM-DD 文字列表現に揃える。
  const boardLabels: Label[] = boardLabelRecords.map((l) => ({
    id: l.id,
    boardId: l.boardId,
    name: l.name,
    color: l.color,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      cards: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { cardLabels: { include: { label: true } } },
      },
    },
  });

  const listsData = lists.map((list) => ({
    id: list.id,
    boardId: list.boardId,
    title: list.title,
    order: list.order,
    cards: list.cards.map((c) => ({
      id: c.id,
      listId: c.listId,
      title: c.title,
      order: c.order,
      dueDate: toDateOnly(c.dueDate),
      labels: c.cardLabels.map((cl) => ({
        id: cl.label.id,
        boardId: cl.label.boardId,
        name: cl.label.name,
        color: cl.label.color,
        createdAt: cl.label.createdAt.toISOString(),
        updatedAt: cl.label.updatedAt.toISOString(),
      })),
    })),
  }));

  return (
    <AppShell
      user={user}
      boards={sidebarBoards}
      activeBoardId={boardId}
      breadcrumb={[
        { label: "ボード一覧", href: "/" },
        { label: board.title },
      ]}
    >
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between gap-2">
          <BoardHeader board={board} canEdit={membership.role === "owner"} />
          <BoardLabelsPanel
            boardId={boardId}
            initialLabels={boardLabels}
            canManage={
              membership.role === "owner" || membership.role === "member"
            }
          />
        </div>

        <div className="mt-6">
          <ListCreateForm boardId={boardId} />
        </div>

        <div className="mt-6">
          <BoardWorkspace
            boardId={boardId}
            lists={listsData}
            canWrite={
              membership.role === "owner" || membership.role === "member"
            }
            boardLabels={boardLabels}
            boardMembers={assigneeCandidates.map((c) => ({
              id: c.userId,
              name: c.name,
            }))}
            currentUserId={user.id}
          />
        </div>
      </div>

      {cardParam ? (
        <CardDetailModal
          cardId={cardParam}
          currentUserRole={membership.role}
          assigneeCandidates={assigneeCandidates}
          boardLabels={boardLabels}
        />
      ) : null}
    </AppShell>
  );
}
