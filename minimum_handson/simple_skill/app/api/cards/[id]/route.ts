// FR-403 PATCH /api/cards/[id]
import { NextRequest, NextResponse } from "next/server";
import { findCard, updateCardTitle } from "@/lib/repository/card";
import { validateTitle } from "@/lib/validation/title";
import { AppError, NotFoundError, errorResponse } from "@/lib/errors";

const TITLE_MAX = 200;

type Params = { params: Promise<{ id: string }> };

// FR-403 対象カードの存在を先に確認し、存在すればトリム後のタイトルを検証して更新
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // E-401 存在しないカードは、body が不正でも 404 を優先する
    const card = await findCard(id);
    if (!card) throw new NotFoundError("カードが見つかりません");
    const body = await request.json().catch(() => ({}));
    const title = validateTitle(body?.title, TITLE_MAX);
    const updated = await updateCardTitle(id, title);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e);
    throw e;
  }
}
