// spec/012_member_invite.md § FR-02 / FR-03 / design/012_member_invite.md § UI 構造
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import { hashInviteToken, isExpired } from "@/lib/invites/token";
import InviteAcceptPanel from "@/components/invites/InviteAcceptPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const tokenHash = hashInviteToken(token);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: { board: { select: { id: true, title: true } } },
  });
  if (!invite) return notFound();

  const user = await getCurrentUserFromCookies();
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <InviteAcceptPanel
        token={token}
        invite={{
          boardId: invite.boardId,
          boardTitle: invite.board.title,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt.toISOString(),
          expired: isExpired(invite.expiresAt),
        }}
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
}
