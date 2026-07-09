import { NextResponse } from "next/server";
import { createBoardSchema } from "@/lib/validation/board";
import { createBoard, listBoards } from "@/lib/repository/board";

// spec/01_board.md FR-001
export async function GET() {
  const boards = await listBoards();
  return NextResponse.json(boards);
}

// spec/01_board.md FR-003
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createBoardSchema.safeParse(body);

  // spec/01_board.md E-001 / E-002
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "titleは1〜100文字で入力してください",
        },
      },
      { status: 400 },
    );
  }

  const board = await createBoard(parsed.data.title);
  return NextResponse.json(board, { status: 201 });
}
