// spec/012_member_invite.md FR-003 / design/012_member_invite.md § API設計
// 判定順序: 認証 → token存在 → 期限切れ/失効 → 承認済み → email一致 → 既メンバー
import { NextRequest, NextResponse } from "next/server";
import { inviteRepository, isExpired } from "@/lib/repository/invite";
import { memberRepository } from "@/lib/repository/member";
import { getSessionUser } from "@/lib/auth/session";
import type { BoardRole } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import {
  unauthorized,
  forbidden,
  notFound,
  conflict,
  gone,
  internalError,
} from "@/lib/errors";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { token } = await ctx.params;
    const invite = await inviteRepository.findByToken(token);
    if (!invite) return notFound("指定された招待が見つかりません");

    if (invite.status === "revoked" || isExpired(invite.expiresAt)) {
      auditLog(requestId, "invite.accept_failed", {
        inviteId: invite.id,
        reason: invite.status === "revoked" ? "revoked" : "expired",
      });
      return gone("この招待は有効期限が切れているか、失効しています", {
        _root: invite.status === "revoked" ? "revoked" : "expired",
      });
    }
    if (invite.status === "accepted") {
      auditLog(requestId, "invite.accept_failed", {
        inviteId: invite.id,
        reason: "already_accepted",
      });
      return conflict("この招待は既に承認済みです", { _root: "already_accepted" });
    }

    // 本人性の確認: 招待の email とログインユーザーの email が一致すること
    if (invite.email !== user.email) {
      auditLog(requestId, "invite.accept_failed", {
        inviteId: invite.id,
        reason: "email_mismatch",
      });
      return forbidden();
    }

    const existing = await memberRepository.find(invite.boardId, user.id);
    if (existing) {
      auditLog(requestId, "invite.accept_failed", {
        inviteId: invite.id,
        reason: "already_member",
      });
      return conflict("既にこのボードのメンバーです", { _root: "already_member" });
    }

    await inviteRepository.accept(
      invite.id,
      invite.boardId,
      user.id,
      invite.role as BoardRole,
    );
    auditLog(requestId, "invite.accept", {
      boardId: invite.boardId,
      inviteId: invite.id,
      userId: user.id,
      role: invite.role,
    });
    return NextResponse.json({ ok: true, boardId: invite.boardId, role: invite.role });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
