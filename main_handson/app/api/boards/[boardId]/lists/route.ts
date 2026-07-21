// spec/002_lists.md § API（リスト一覧取得・作成）/ spec/013_permissions.md
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import { validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };
const NOT_FOUND_MESSAGE = "指定されたボードが見つかりません";

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "viewer");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    const lists = await listRepository.findByBoard(boardId);
    return NextResponse.json({ items: lists });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "member");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const list = await listRepository.create(boardId, result.value);
    auditLog(requestId, "list.create", { boardId, listId: list.id, title: list.title });
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
