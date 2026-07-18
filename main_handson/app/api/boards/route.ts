// spec/001_boards.md FR-001, FR-003
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { currentUser } from "@/lib/auth/currentUser";
import { auditLog } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import { unauthorized, validationError, internalError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const boards = await boardRepository.listForUser(user.id);
    return NextResponse.json({ items: boards });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const board = await boardRepository.create(user.id, result.value);
    auditLog("board.create", { actor: user.id, boardId: board.id, title: board.title });
    return NextResponse.json(board, { status: 201 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
