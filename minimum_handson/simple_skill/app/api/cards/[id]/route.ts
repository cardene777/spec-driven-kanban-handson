// FR-003 (spec/04_card_edit.md)
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { validateTitle } from "@/lib/validation/title";
import {
  validationError,
  notFoundError,
  internalError,
} from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const card = await cardRepository.findById(id);
    if (!card) return notFoundError("指定されたカードが見つかりません");
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 200);
    if (!result.ok) return validationError(result.message);
    const updated = await cardRepository.updateTitle(id, result.value);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
