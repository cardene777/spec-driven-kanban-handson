import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boards);
}

export async function POST(request: Request) {
  const body = await request.json();
  const board = await prisma.board.create({
    data: { title: body.title },
  });
  return NextResponse.json(board, { status: 201 });
}
