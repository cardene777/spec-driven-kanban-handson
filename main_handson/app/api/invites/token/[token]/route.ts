// spec/012_member_invite.md § API（招待内容の確認）/ design/012_member_invite.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inviteRepository, isExpired } from "@/lib/repository/invite";
import { getSessionUser } from "@/lib/auth/session";
import { errorLog, newRequestId } from "@/lib/audit/log";
import { unauthorized, notFound, conflict, gone, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { token } = await ctx.params;
    const invite = await inviteRepository.findByToken(token);
    if (!invite) return notFound("指定された招待が見つかりません");

    if (invite.status === "revoked" || isExpired(invite.expiresAt)) {
      return gone("この招待は有効期限が切れているか、失効しています", {
        _root: invite.status === "revoked" ? "revoked" : "expired",
      });
    }
    if (invite.status === "accepted") {
      return conflict("この招待は既に承認済みです", { _root: "already_accepted" });
    }

    const board = await prisma.board.findUnique({
      where: { id: invite.boardId },
      select: { id: true, title: true },
    });

    return NextResponse.json({
      invite: {
        boardId: invite.boardId,
        boardTitle: board?.title ?? "",
        role: invite.role,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
