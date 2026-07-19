// FR-304 GET /api/lists/[id]/cards, FR-305 POST /api/lists/[id]/cards
import { NextRequest, NextResponse } from "next/server";
import { findList } from "@/lib/repository/list";
import { listCardsByList, createCard } from "@/lib/repository/card";
import { validateTitle } from "@/lib/validation/title";
import { AppError, NotFoundError, errorResponse } from "@/lib/errors";

const TITLE_MAX = 200;

type Params = { params: Promise<{ id: string }> };

// FR-304 対象リストのカードを order 昇順で返す
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // 対象リストが無ければ 404
    const list = await findList(id);
    if (!list) throw new NotFoundError("リストが見つかりません");
    const cards = await listCardsByList(id);
    return NextResponse.json(cards);
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e);
    throw e;
  }
}

// FR-305 対象リストの存在を先に確認し、存在すればトリム後のタイトルを検証して作成
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // E-301 存在しないリストは、body が不正でも 404 を優先する
    const list = await findList(id);
    if (!list) throw new NotFoundError("リストが見つかりません");
    const body = await request.json().catch(() => ({}));
    const title = validateTitle(body?.title, TITLE_MAX);
    const card = await createCard(id, title);
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e);
    throw e;
  }
}
