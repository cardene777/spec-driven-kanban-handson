import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cards = await prisma.card.findMany({
    where: { listId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(cards);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const count = await prisma.card.count({ where: { listId: id } });
  const card = await prisma.card.create({
    data: {
      title: body.title,
      description: body.description,
      order: count,
      listId: id,
    },
  });
  return NextResponse.json(card, { status: 201 });
}
