import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const card = await prisma.card.update({
    where: { id },
    data: { title: body.title },
  });
  return NextResponse.json(card);
}
