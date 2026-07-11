// spec/002_lists.md FR-002 (GET) / FR-004 (POST)、404 優先 (E-001)
import { NextRequest, NextResponse } from "next/server";
import { findBoardById } from "@/lib/repository/boards";
import {
  createListInBoard,
  findListsByBoardId,
} from "@/lib/repository/lists";
import { validateTitle } from "@/lib/validation";
import {
  NOT_FOUND_MESSAGES,
  VALIDATION_MESSAGES,
  internalError,
  notFoundError,
  validationError,
} from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const board = await findBoardById(id);
    if (!board) return notFoundError(NOT_FOUND_MESSAGES.board);
    const lists = await findListsByBoardId(id);
    return NextResponse.json({ lists });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const board = await findBoardById(id);
    if (!board) return notFoundError(NOT_FOUND_MESSAGES.board);
  } catch {
    return internalError();
  }

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
    const list = await createListInBoard(id, result.value);
    return NextResponse.json({ list }, { status: 201 });
  } catch {
    return internalError();
  }
}
