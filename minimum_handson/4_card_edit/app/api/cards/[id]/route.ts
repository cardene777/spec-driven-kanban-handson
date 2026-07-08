import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Next.js 16 では動的ルートの params は Promise で渡される
type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/cards/[id] … カードのタイトルを更新する
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

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

  try {
    const card = await prisma.card.update({
      where: { id },
      data: { title: title.trim() },
    });
    return NextResponse.json(card);
  } catch (err) {
    // 対象のカードが存在しない場合は 404
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "カードが見つかりません" },
        { status: 404 }
      );
    }
    throw err;
  }
}
