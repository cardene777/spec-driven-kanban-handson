import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/boards/[id]/lists - 指定ボードのリスト一覧をorderの昇順で返す
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) {
    return NextResponse.json(
      { error: "ボードが見つかりません" },
      { status: 404 }
    );
  }

  const lists = await prisma.list.findMany({
    where: { boardId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(lists);
}

// POST /api/boards/[id]/lists - タイトルを受け取ってリストを作成する
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const board = await prisma.board.findUnique({ where: { id } });
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
    return NextResponse.json({ error: "titleは必須です" }, { status: 400 });
  }

  // 同じボード内の末尾に追加する（order = 現在の最大order + 1）
  const last = await prisma.list.findFirst({
    where: { boardId: id },
    orderBy: { order: "desc" },
  });
  const nextOrder = last ? last.order + 1 : 0;

  const list = await prisma.list.create({
    data: { title: title.trim(), order: nextOrder, boardId: id },
  });

  return NextResponse.json(list, { status: 201 });
}
