// spec/001_boards.md § API（ボード名編集・削除）/ spec/013_permissions.md
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };
const NOT_FOUND_MESSAGE = "指定されたボードが見つかりません";

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "viewer");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    const board = await boardRepository.findById(boardId);
    if (!board) return notFound(NOT_FOUND_MESSAGE);
    return NextResponse.json(board);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "owner");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const updated = await boardRepository.updateTitle(boardId, result.value);
    auditLog(requestId, "board.update", { boardId, title: updated.title });
    return NextResponse.json(updated);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "owner");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    // 配下の List/Card/Label と BoardMembership/Invite は cascade で削除される
    await boardRepository.delete(boardId);
    auditLog(requestId, "board.delete", { boardId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
