// FR-001 / FR-003 (spec/03_card.md)
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
import { validateTitle } from "@/lib/validation/title";
import {
  validationError,
  notFoundError,
  internalError,
} from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const list = await listRepository.findById(id);
    if (!list) return notFoundError("指定されたリストが見つかりません");
    const cards = await cardRepository.findByList(id);
    return NextResponse.json(cards);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const list = await listRepository.findById(id);
    if (!list) return notFoundError("指定されたリストが見つかりません");
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 200);
    if (!result.ok) return validationError(result.message);
    const card = await cardRepository.create(id, result.value);
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
