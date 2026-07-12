// spec/012_member_invite.md § FR-02 / design/012_member_invite.md § GET /api/invites/{token}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { hashInviteToken, isExpired } from "@/lib/invites/token";
import { NotFoundError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  return withApiHandler(
    async () => {
      const tokenHash = hashInviteToken(token);
      const invite = await prisma.invite.findUnique({
        where: { tokenHash },
        include: { board: { select: { id: true, title: true } } },
      });
      if (!invite) throw new NotFoundError();
      const expired = isExpired(invite.expiresAt);
      const res = NextResponse.json({
        boardId: invite.boardId,
        boardTitle: invite.board.title,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt.toISOString(),
        expired,
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    {
      event: "invite.view",
      targetType: "invite",
      targetId: null,
    },
  );
}
