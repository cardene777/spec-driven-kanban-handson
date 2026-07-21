// spec/012_member_invite.md FR-001 / FR-006 / design/012_member_invite.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inviteRepository, inviteUrl, type InviteRole } from "@/lib/repository/invite";
import { memberRepository } from "@/lib/repository/member";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { isValidEmail } from "@/lib/validation/auth";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { conflict, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };

const INVITE_ROLES: InviteRole[] = ["member", "viewer"];

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "owner");
    const err = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (err) return err;

    const invites = await inviteRepository.listByBoard(boardId);
    // token は一覧に含めない
    const items = invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "owner");
    const err = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (err) return err;
    if (access.kind !== "ok") return internalError();

    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      role?: unknown;
    };
    if (!isValidEmail(body.email)) {
      return validationError("メールアドレスの形式が正しくありません", { email: "invalid" });
    }
    if (typeof body.role !== "string" || !INVITE_ROLES.includes(body.role as InviteRole)) {
      return validationError("roleは member / viewer のいずれかです", { role: "invalid" });
    }
    const email = body.email as string;

    // 既に pending の招待がある
    const pending = await inviteRepository.findPendingByEmail(boardId, email);
    if (pending) {
      return conflict("このメールアドレスへの招待は既に送信されています", {
        _root: "duplicate_invite",
      });
    }
    // 既にメンバーである
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (invitedUser) {
      const existing = await memberRepository.find(boardId, invitedUser.id);
      if (existing) {
        return conflict("このユーザーは既にボードのメンバーです", { _root: "already_member" });
      }
    }

    const invite = await inviteRepository.create(
      boardId,
      email,
      body.role as InviteRole,
      access.user.id,
    );
    auditLog(requestId, "invite.create", {
      boardId,
      inviteId: invite.id,
      email,
      role: invite.role,
      actorUserId: access.user.id,
    });
    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
        },
        inviteUrl: inviteUrl(invite.token),
      },
      { status: 201 },
    );
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
