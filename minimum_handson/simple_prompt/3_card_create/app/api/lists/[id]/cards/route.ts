import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js 16 では動的ルートの params は Promise で渡される
type RouteContext = { params: Promise<{ id: string }> };

// GET /api/lists/[id]/cards … 指定リストのカードを order の昇順で返す
export async function GET(_request: Request, { params }: RouteContext) {
  const { id: listId } = await params;

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json(
      { error: "リストが見つかりません" },
      { status: 404 }
    );
  }

  const cards = await prisma.card.findMany({
    where: { listId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(cards);
}

// POST /api/lists/[id]/cards … title(必須) と description(任意) でカードを作成する
// order は同じリスト内の末尾（既存の最大 order + 1）に採番する
export async function POST(request: Request, { params }: RouteContext) {
  const { id: listId } = await params;

  const list = await prisma.list.findUnique({ where: { id: listId } });
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

  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const title = record.title;
  const description = record.description;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title は必須です" }, { status: 400 });
  }
  // description は省略可能。渡された場合は文字列のみ許可する
  if (description !== undefined && typeof description !== "string") {
    return NextResponse.json(
      { error: "description は文字列で指定してください" },
      { status: 400 }
    );
  }

  // 末尾に追加するため、現在の最大 order を求める
  const last = await prisma.card.findFirst({
    where: { listId },
    orderBy: { order: "desc" },
  });
  const nextOrder = last ? last.order + 1 : 0;

  const trimmedDescription =
    typeof description === "string" ? description.trim() : "";

  const card = await prisma.card.create({
    data: {
      title: title.trim(),
      description: trimmedDescription === "" ? null : trimmedDescription,
      order: nextOrder,
      listId,
    },
  });

  return NextResponse.json(card, { status: 201 });
}
