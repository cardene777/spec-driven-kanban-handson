import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lists = await prisma.list.findMany({
    where: { boardId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(lists);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const count = await prisma.list.count({ where: { boardId: id } });
  const list = await prisma.list.create({
    data: { title: body.title, boardId: id, order: count },
  });
  return NextResponse.json(list, { status: 201 });
}
