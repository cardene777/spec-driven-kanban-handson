import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const list = await prisma.list.findUnique({ where: { id } });
  if (!list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  const cards = await prisma.card.findMany({
    where: { listId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(cards);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const list = await prisma.list.findUnique({ where: { id } });
  if (!list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const rawDescription =
    typeof body?.description === "string" ? body.description.trim() : "";
  const description = rawDescription.length > 0 ? rawDescription : null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const last = await prisma.card.findFirst({
    where: { listId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? -1) + 1;

  const card = await prisma.card.create({
    data: { title, description, order: nextOrder, listId: id },
  });

  return NextResponse.json(card, { status: 201 });
}
