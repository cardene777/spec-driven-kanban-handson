import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boards);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 },
    );
  }

  const board = await prisma.board.create({
    data: { title },
  });

  return NextResponse.json(board, { status: 201 });
}
