// spec/001_boards.md § API / design/001_boards.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { parseBoardCreate } from "@/lib/schemas/boards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const memberships = await prisma.boardMembership.findMany({
        where: { userId: user.id },
        include: { board: true },
      });
      const items = memberships
        .map((m) => m.board)
        .sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "board.list", targetType: "board" },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const { title } = parseBoardCreate(body);
      const created = await prisma.$transaction(async (tx) => {
        const max = await tx.board.aggregate({ _max: { order: true } });
        const nextOrder = (max._max.order ?? -1) + 1;
        const board = await tx.board.create({
          data: { title, order: nextOrder },
        });
        await tx.boardMembership.create({
          data: { boardId: board.id, userId: user.id, role: "owner" },
        });
        return board;
      });
      return NextResponse.json(created, { status: 201 });
    },
    {
      event: "board.create",
      targetType: "board",
      context: { title: (body as { title?: string })?.title },
    },
  );
}
