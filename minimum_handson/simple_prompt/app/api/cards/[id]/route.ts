import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: { title?: string } = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    data.title = title;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  const updated = await prisma.card.update({ where: { id }, data });

  return NextResponse.json(updated);
}
