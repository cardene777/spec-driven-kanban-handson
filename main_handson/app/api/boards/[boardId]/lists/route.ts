// spec/002_lists.md FR-001, FR-003
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { currentUser } from "@/lib/auth/currentUser";
import { checkBoardAccess } from "@/lib/auth/requireBoardRole";
import { auditLog } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import {
  unauthorized,
  forbidden,
  notFound,
  validationError,
  internalError,
} from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(user.id, boardId, "viewer");
    if (access.kind === "not_found") return notFound("指定されたボードが見つかりません");
    if (access.kind === "forbidden") return forbidden();
    const lists = await listRepository.findByBoard(boardId);
    return NextResponse.json({ items: lists });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(user.id, boardId, "member");
    if (access.kind === "not_found") return notFound("指定されたボードが見つかりません");
    if (access.kind === "forbidden") return forbidden();
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const list = await listRepository.create(boardId, result.value);
    auditLog("list.create", {
      actor: user.id,
      boardId,
      listId: list.id,
      title: list.title,
    });
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
