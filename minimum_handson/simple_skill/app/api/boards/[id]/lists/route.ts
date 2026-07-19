// FR-204 GET /api/boards/[id]/lists, FR-205 POST /api/boards/[id]/lists
import { NextRequest, NextResponse } from "next/server";
import { findBoard } from "@/lib/repository/board";
import { listListsByBoard, createList } from "@/lib/repository/list";
import { validateTitle } from "@/lib/validation/title";
import { AppError, NotFoundError, errorResponse } from "@/lib/errors";

const TITLE_MAX = 100;

type Params = { params: Promise<{ id: string }> };

// FR-204 対象ボードのリストを order 昇順で返す
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // 対象ボードが無ければ 404
    const board = await findBoard(id);
    if (!board) throw new NotFoundError("ボードが見つかりません");
    const lists = await listListsByBoard(id);
    return NextResponse.json(lists);
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e);
    throw e;
  }
}

// FR-205 対象ボードの存在を先に確認し、存在すればトリム後のタイトルを検証して作成
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // E-201 存在しないボードは、body が不正でも 404 を優先する
    const board = await findBoard(id);
    if (!board) throw new NotFoundError("ボードが見つかりません");
    const body = await request.json().catch(() => ({}));
    const title = validateTitle(body?.title, TITLE_MAX);
    const list = await createList(id, title);
    return NextResponse.json(list, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return errorResponse(e);
    throw e;
  }
}
