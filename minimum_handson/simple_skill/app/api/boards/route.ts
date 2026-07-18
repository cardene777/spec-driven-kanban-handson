// FR-001 / FR-003 (spec/01_board.md)
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { validateTitle } from "@/lib/validation/title";
import { validationError, internalError } from "@/lib/errors";

export async function GET() {
  try {
    const boards = await boardRepository.list();
    return NextResponse.json(boards);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) return validationError(result.message);
    const board = await boardRepository.create(result.value);
    return NextResponse.json(board, { status: 201 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
