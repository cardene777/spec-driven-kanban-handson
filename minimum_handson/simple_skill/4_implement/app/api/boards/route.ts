// spec/001_boards.md FR-001 (GET) / FR-004 (POST)
import { NextRequest, NextResponse } from "next/server";
import { createBoard, findAllBoards } from "@/lib/repository/boards";
import { validateTitle } from "@/lib/validation";
import {
  VALIDATION_MESSAGES,
  internalError,
  validationError,
} from "@/lib/errors";

export async function GET() {
  try {
    const boards = await findAllBoards();
    return NextResponse.json({ boards });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError(VALIDATION_MESSAGES.boardOrListTitle);
  }

  const raw =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).title
      : undefined;
  const result = validateTitle(raw, 100);
  if (!result.ok) return validationError(VALIDATION_MESSAGES.boardOrListTitle);

  try {
    const board = await createBoard(result.value);
    return NextResponse.json({ board }, { status: 201 });
  } catch {
    return internalError();
  }
}
