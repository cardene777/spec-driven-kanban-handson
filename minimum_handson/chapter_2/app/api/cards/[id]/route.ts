import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/cards/[id] - カードのタイトルを更新する
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json(
      { error: "カードが見つかりません" },
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

  const updated = await prisma.card.update({
    where: { id },
    data: { title: title.trim() },
  });

  return NextResponse.json(updated);
}
