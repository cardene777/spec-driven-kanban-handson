// spec/013_permissions.md § FR-01 / spec/012_member_invite.md § FR-01
// design/013_permissions.md § UI 構造 + design/012_member_invite.md § UI 構造
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import { sortMembers } from "@/lib/permissions/sortMembers";
import AppShell from "@/components/layout/AppShell";
import BoardMemberList from "@/components/members/BoardMemberList";
import InviteCreateForm from "@/components/members/InviteCreateForm";
import InviteList from "@/components/members/InviteList";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardMembersPage({ params }: Props) {
  const { boardId } = await params;
  const user = await getCurrentUserFromCookies();
  if (!user) redirect(`/login?returnTo=/boards/${boardId}/members`);

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return notFound();

  const myMembership = await prisma.boardMembership.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });
  if (!myMembership) return notFound();

  const myMemberships = await prisma.boardMembership.findMany({
    where: { userId: user.id },
    include: { board: true },
  });
  const sidebarBoards = myMemberships
    .map((m) => m.board)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const memberships = await prisma.boardMembership.findMany({
    where: { boardId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  const members = sortMembers(
    memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    })),
  ).map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));

  const isOwner = myMembership.role === "owner";
  const invites = isOwner
    ? (
        await prisma.invite.findMany({
          where: { boardId, status: "pending" },
          orderBy: [{ createdAt: "desc" }],
        })
      ).map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt.toISOString(),
      }))
    : [];

  return (
    <AppShell
      user={user}
      boards={sidebarBoards}
      activeBoardId={boardId}
      breadcrumb={[
        { label: "ボード一覧", href: "/" },
        { label: board.title, href: `/boards/${boardId}` },
        { label: "メンバー管理" },
      ]}
    >
      <div className="mx-auto max-w-3xl px-6 py-6">
        <h1 className="font-heading text-2xl font-semibold">
          {board.title} — メンバー管理
        </h1>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-medium">メンバー一覧</h2>
          <BoardMemberList
            boardId={boardId}
            members={members}
            currentUserId={user.id}
            currentRole={myMembership.role}
          />
        </section>

        {isOwner ? (
          <>
            <section className="mt-8">
              <h2 className="mb-2 text-lg font-medium">招待</h2>
              <InviteCreateForm boardId={boardId} />
            </section>
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-medium">Pending の招待</h2>
              <InviteList boardId={boardId} invites={invites} />
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
