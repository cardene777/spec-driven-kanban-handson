// spec/001_boards.md § API（ボード一覧取得・作成）/ spec/013_permissions.md
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { getSessionUser } from "@/lib/auth/session";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import { unauthorized, validationError, internalError } from "@/lib/errors";

// メンバーであるボードのみを返す
export async function GET() {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    const boards = await boardRepository.listForUser(user.id);
    return NextResponse.json({ items: boards });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

// 認証済みなら誰でも作成できる。作成者が owner になる。
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const board = await boardRepository.create(user.id, result.value);
    auditLog(requestId, "board.create", {
      boardId: board.id,
      title: board.title,
      actorUserId: user.id,
    });
    return NextResponse.json(board, { status: 201 });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
