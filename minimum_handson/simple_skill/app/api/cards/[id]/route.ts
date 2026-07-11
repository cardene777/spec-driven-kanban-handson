// spec/004_card_edit.md FR-003 (PATCH)、404 優先 (E-001)、title 以外の body は無視
import { NextRequest, NextResponse } from "next/server";
import { findCardById, updateCardTitle } from "@/lib/repository/cards";
import { validateTitle } from "@/lib/validation";
import {
  NOT_FOUND_MESSAGES,
  VALIDATION_MESSAGES,
  internalError,
  notFoundError,
  validationError,
} from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const card = await findCardById(id);
    if (!card) return notFoundError(NOT_FOUND_MESSAGES.card);
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
    const card = await updateCardTitle(id, result.value);
    return NextResponse.json({ card });
  } catch {
    return internalError();
  }
}
