// spec/003_cards.md FR-001 (GET) / FR-004 (POST)、404 優先 (E-001)
import { NextRequest, NextResponse } from "next/server";
import { findListById } from "@/lib/repository/lists";
import { createCardInList, findCardsByListId } from "@/lib/repository/cards";
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
    const list = await findListById(id);
    if (!list) return notFoundError(NOT_FOUND_MESSAGES.list);
    const cards = await findCardsByListId(id);
    return NextResponse.json({ cards });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const list = await findListById(id);
    if (!list) return notFoundError(NOT_FOUND_MESSAGES.list);
  } catch {
    return internalError();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError(VALIDATION_MESSAGES.cardTitle);
  }

  const raw =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).title
      : undefined;
  const result = validateTitle(raw, 200);
  if (!result.ok) return validationError(VALIDATION_MESSAGES.cardTitle);

  try {
    const card = await createCardInList(id, result.value);
    return NextResponse.json({ card }, { status: 201 });
  } catch {
    return internalError();
  }
}
