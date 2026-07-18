// spec/001_boards.md FR-004, FR-005
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
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
    const board = await boardRepository.findById(boardId);
    if (!board) return notFound("指定されたボードが見つかりません");
    return NextResponse.json(board);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(user.id, boardId, "owner");
    if (access.kind === "not_found") return notFound("指定されたボードが見つかりません");
    if (access.kind === "forbidden") return forbidden();
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const board = await boardRepository.updateTitle(boardId, result.value);
    auditLog("board.update", { actor: user.id, boardId, title: board.title });
    return NextResponse.json(board);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(user.id, boardId, "owner");
    if (access.kind === "not_found") return notFound("指定されたボードが見つかりません");
    if (access.kind === "forbidden") return forbidden();
    await boardRepository.delete(boardId);
    auditLog("board.delete", { actor: user.id, boardId });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
