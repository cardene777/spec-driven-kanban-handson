import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/boards … ボードを createdAt の降順で返す
export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boards);
}

// POST /api/boards … title を受け取ってボードを作成する
export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: "title は必須です" },
      { status: 400 }
    );
  }

  const board = await prisma.board.create({
    data: { title: title.trim() },
  });

  return NextResponse.json(board, { status: 201 });
}
