import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js 16 では動的ルートの params は Promise で渡される
type RouteContext = { params: Promise<{ id: string }> };

// GET /api/boards/[id]/lists … 指定ボードのリストを order の昇順で返す
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: boardId } = await params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return NextResponse.json(
      { error: "ボードが見つかりません" },
      { status: 404 }
    );
  }

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(lists);
}

// POST /api/boards/[id]/lists … title を受け取ってリストを作成する
// order は同じボード内の末尾（既存の最大 order + 1）に採番する
export async function POST(request: Request, { params }: RouteContext) {
  const { id: boardId } = await params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return NextResponse.json(
      { error: "ボードが見つかりません" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }

  const title =
    typeof body === "object" && body !== null && "title" in body
      ? (body as { title: unknown }).title
      : undefined;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title は必須です" }, { status: 400 });
  }

  // 末尾に追加するため、現在の最大 order を求める
  const last = await prisma.list.findFirst({
    where: { boardId },
    orderBy: { order: "desc" },
  });
  const nextOrder = last ? last.order + 1 : 0;

  const list = await prisma.list.create({
    data: { title: title.trim(), order: nextOrder, boardId },
  });

  return NextResponse.json(list, { status: 201 });
}
