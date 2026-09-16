import { NextResponse } from "next/server";
import { AppError, errorResponse, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { validateTitle } from "@/lib/validation/title";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) throw new NotFoundError("ボードが見つかりません");
    const lists = await prisma.list.findMany({
      where: { boardId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(lists);
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) throw new NotFoundError("ボードが見つかりません");
    const body = await request.json().catch(() => ({}));
    const latest = await prisma.list.findFirst({
      where: { boardId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const list = await prisma.list.create({
      data: { title: validateTitle(body.title, 100), boardId: id, order: (latest?.order ?? -1) + 1 },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    throw error;
  }
}
