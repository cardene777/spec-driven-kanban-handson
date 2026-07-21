// spec/013_permissions.md § 画面（メンバー管理）/ spec/012_member_invite.md § 画面
import { notFound, redirect } from "next/navigation";
import { boardRepository } from "@/lib/repository/board";
import { memberRepository } from "@/lib/repository/member";
import { inviteRepository } from "@/lib/repository/invite";
import { checkBoardAccess } from "@/lib/auth/permissions";
import AppShell from "@/components/layout/AppShell";
import MemberList from "./_components/MemberList";
import InvitePanel from "./_components/InvitePanel";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ boardId: string }> };

export default async function MembersPage({ params }: PageProps) {
  const { boardId } = await params;

  const access = await checkBoardAccess(boardId, "viewer");
  if (access.kind === "unauthorized") redirect("/login");
  if (access.kind !== "ok") notFound();

  const board = await boardRepository.findById(boardId);
  if (!board) notFound();

  const isOwner = access.role === "owner";
  const allBoards = await boardRepository.listForUser(access.user.id);
  const members = await memberRepository.listByBoard(boardId);
  // 招待一覧は owner のみ取得する
  const invites = isOwner ? await inviteRepository.listByBoard(boardId) : [];

  return (
    <AppShell
      user={access.user}
      boards={allBoards.map((b) => ({ id: b.id, title: b.title }))}
      activeBoardId={boardId}
      breadcrumb={[
        { label: "ボード一覧", href: "/" },
        { label: board.title, href: `/boards/${boardId}` },
        { label: "メンバー" },
      ]}
    >
      <div className="w-full max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold">メンバー</h1>

        <MemberList
          boardId={boardId}
          members={members}
          isOwner={isOwner}
          currentUserId={access.user.id}
        />

        {isOwner && (
          <InvitePanel
            boardId={boardId}
            invites={invites.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              status: i.status,
              expiresAt: String(i.expiresAt),
            }))}
          />
        )}
      </div>
    </AppShell>
  );
}
