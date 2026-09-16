import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { validateTitle } from "@/lib/validation/title";

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boards);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const board = await prisma.board.create({
      data: { title: validateTitle(body.title, 100) },
    });
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    throw error;
  }
}
