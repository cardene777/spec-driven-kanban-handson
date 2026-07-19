// FR-104 GET /api/boards, FR-105 POST /api/boards
import { NextRequest, NextResponse } from "next/server";
import { listBoards, createBoard } from "@/lib/repository/board";
import { validateTitle } from "@/lib/validation/title";
import { AppError, errorResponse } from "@/lib/errors";

const TITLE_MAX = 100;

// FR-104 全ボードを createdAt 降順で返す
export async function GET() {
  const boards = await listBoards();
  return NextResponse.json(boards);
}

// FR-105 トリム後のタイトルを検証してボードを作成する
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = validateTitle(body?.title, TITLE_MAX);
    const board = await createBoard(title);
    return NextResponse.json(board, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e);
    throw e;
  }
}
