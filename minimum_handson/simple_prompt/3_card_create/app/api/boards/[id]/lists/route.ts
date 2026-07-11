import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) {
    return NextResponse.json({ error: "board not found" }, { status: 404 });
  }

  const lists = await prisma.list.findMany({
    where: { boardId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(lists);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) {
    return NextResponse.json({ error: "board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const last = await prisma.list.findFirst({
    where: { boardId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  const list = await prisma.list.create({
    data: { title, order: nextOrder, boardId: id },
  });

  return NextResponse.json(list, { status: 201 });
}
