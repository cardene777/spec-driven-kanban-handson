import { NextResponse } from "next/server";
import { AppError, errorResponse, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { validateTitle } from "@/lib/validation/title";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundError("カードが見つかりません");
    const body = await request.json().catch(() => ({}));
    const updated = await prisma.card.update({
      where: { id },
      data: { title: validateTitle(body.title, 200) },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error);
    throw error;
  }
}
