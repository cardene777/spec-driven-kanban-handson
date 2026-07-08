import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/lists/[id]/cards - 指定リストのカード一覧をorderの昇順で返す
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const list = await prisma.list.findUnique({ where: { id } });
  if (!list) {
    return NextResponse.json(
      { error: "リストが見つかりません" },
      { status: 404 }
    );
  }

  const cards = await prisma.card.findMany({
    where: { listId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(cards);
}

// POST /api/lists/[id]/cards - タイトル(と任意のdescription)を受け取ってカードを作成する
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const list = await prisma.list.findUnique({ where: { id } });
  if (!list) {
    return NextResponse.json(
      { error: "リストが見つかりません" },
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

  const record = (body ?? {}) as Record<string, unknown>;
  const title = record.title;
  const description = record.description;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "titleは必須です" }, { status: 400 });
  }
  // descriptionは省略可能（文字列でなければ未設定として扱う）
  const desc =
    typeof description === "string" && description.trim() !== ""
      ? description.trim()
      : null;

  // 同じリスト内の末尾に追加する（order = 現在の最大order + 1）
  const last = await prisma.card.findFirst({
    where: { listId: id },
    orderBy: { order: "desc" },
  });
  const nextOrder = last ? last.order + 1 : 0;

  const card = await prisma.card.create({
    data: { title: title.trim(), description: desc, order: nextOrder, listId: id },
  });

  return NextResponse.json(card, { status: 201 });
}
