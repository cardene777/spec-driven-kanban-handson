// spec/013_permissions.md § FR-01 / spec/012_member_invite.md § FR-01
// design/013_permissions.md § UI 構造 + design/012_member_invite.md § UI 構造
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import { sortMembers } from "@/lib/permissions/sortMembers";
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
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-neutral-0">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <nav className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
            <Link
              href="/"
              className="rounded-md px-1.5 py-0.5 font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              ボード一覧
            </Link>
            <span className="text-neutral-300">/</span>
            <Link
              href={`/boards/${boardId}`}
              className="rounded-md px-1.5 py-0.5 font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {board.title}
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="font-medium text-neutral-700">メンバー管理</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            メンバー管理
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {board.title} のメンバーと招待を管理します。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              メンバー一覧 ({members.length})
            </h2>
          </div>
          <BoardMemberList
            boardId={boardId}
            members={members}
            currentUserId={user.id}
            currentRole={myMembership.role}
          />
        </section>

        {isOwner ? (
          <>
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  招待
                </h2>
              </div>
              <InviteCreateForm boardId={boardId} />
            </section>
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Pending の招待 ({invites.length})
                </h2>
              </div>
              <InviteList boardId={boardId} invites={invites} />
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
