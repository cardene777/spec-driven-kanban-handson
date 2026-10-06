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
    const list = await prisma.list.findUnique({ where: { id } });
    if (!list) throw new NotFoundError("リストが見つかりません");
    const cards = await prisma.card.findMany({
      where: { listId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(cards);
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
    const list = await prisma.list.findUnique({ where: { id } });
    if (!list) throw new NotFoundError("リストが見つかりません");
    const body = await request.json().catch(() => ({}));
    const latest = await prisma.card.findFirst({
      where: { listId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const card = await prisma.card.create({
      data: {
        title: validateTitle(body.title, 200),
        description: body.description ?? null,
        order: (latest?.order ?? -1) + 1,
        listId: id,
      },
    });
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    throw error;
  }
}
