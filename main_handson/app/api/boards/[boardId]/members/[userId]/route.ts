// spec/013_permissions.md FR-002 / FR-003 / FR-004 / design/013_permissions.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { memberRepository } from "@/lib/repository/member";
import {
  checkBoardAccess,
  accessErrorResponse,
  countOwners,
  type BoardRole,
} from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, conflict, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string; userId: string }> };

const ROLES: BoardRole[] = ["owner", "member", "viewer"];

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId, userId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "owner");
    const err = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (err) return err;

    const target = await memberRepository.find(boardId, userId);
    if (!target) return notFound("指定されたメンバーが見つかりません");

    const body = (await req.json().catch(() => ({}))) as { role?: unknown };
    if (typeof body.role !== "string" || !ROLES.includes(body.role as BoardRole)) {
      return validationError("roleは owner / member / viewer のいずれかです", {
        role: "invalid",
      });
    }
    const nextRole = body.role as BoardRole;
    const beforeRole = target.role as BoardRole;

    // 最後の owner は降格できない
    if (beforeRole === "owner" && nextRole !== "owner") {
      const owners = await countOwners(boardId);
      if (owners <= 1) {
        auditLog(requestId, "member.last_owner_denied", { boardId, targetUserId: userId });
        return conflict("最後のオーナーは降格できません。先に別のメンバーをオーナーにしてください", {
          _root: "last_owner",
        });
      }
    }

    const updated = await memberRepository.updateRole(boardId, userId, nextRole);
    auditLog(requestId, "member.role_change", {
      boardId,
      targetUserId: userId,
      beforeRole,
      afterRole: nextRole,
      actorUserId: access.kind === "ok" ? access.user.id : undefined,
    });
    return NextResponse.json({
      userId,
      role: updated.role,
    });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId, userId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "owner");
    const err = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (err) return err;

    const target = await memberRepository.find(boardId, userId);
    if (!target) return notFound("指定されたメンバーが見つかりません");

    // 最後の owner は削除できない
    if (target.role === "owner") {
      const owners = await countOwners(boardId);
      if (owners <= 1) {
        auditLog(requestId, "member.last_owner_denied", { boardId, targetUserId: userId });
        return conflict("最後のオーナーは削除できません。先に別のメンバーをオーナーにしてください", {
          _root: "last_owner",
        });
      }
    }

    await memberRepository.remove(boardId, userId);
    auditLog(requestId, "member.remove", {
      boardId,
      targetUserId: userId,
      actorUserId: access.kind === "ok" ? access.user.id : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
