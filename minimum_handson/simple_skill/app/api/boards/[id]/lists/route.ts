// FR-001 / FR-003 (spec/02_list.md)
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { listRepository } from "@/lib/repository/list";
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
    const board = await boardRepository.findById(id);
    if (!board) return notFoundError("指定されたボードが見つかりません");
    const lists = await listRepository.findByBoard(id);
    return NextResponse.json(lists);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const board = await boardRepository.findById(id);
    if (!board) return notFoundError("指定されたボードが見つかりません");
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) return validationError(result.message);
    const list = await listRepository.create(id, result.value);
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
