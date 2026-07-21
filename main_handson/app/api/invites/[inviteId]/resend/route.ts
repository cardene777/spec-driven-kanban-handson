// spec/012_member_invite.md FR-004 / design/012_member_invite.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { inviteRepository, inviteUrl } from "@/lib/repository/invite";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { unauthorized, notFound, conflict, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ inviteId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { inviteId } = await ctx.params;
    const invite = await inviteRepository.findById(inviteId);
    if (!invite) return notFound("指定された招待が見つかりません");

    const access = await checkBoardAccess(invite.boardId, "owner");
    const err = accessErrorResponse(access, "指定された招待が見つかりません");
    if (err) return err;

    if (invite.status !== "pending") {
      return conflict("この招待は再送できません（承認済みまたは失効済み）", {
        _root: invite.status,
      });
    }

    const updated = await inviteRepository.resend(inviteId);
    auditLog(requestId, "invite.resend", {
      boardId: invite.boardId,
      inviteId,
      actorUserId: user.id,
    });
    return NextResponse.json({
      invite: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        expiresAt: updated.expiresAt,
      },
      inviteUrl: inviteUrl(updated.token),
    });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
