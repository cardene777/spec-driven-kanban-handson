// spec/003_cards.md § API / design/003_cards.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromList } from "@/lib/auth/cardAccess";
import { parseCardCreate } from "@/lib/schemas/cards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ listId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { listId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const list = await resolveBoardFromList(listId);
      await assertBoardAccess(user.id, list.boardId, "viewer");
      const items = await prisma.card.findMany({
        where: { listId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "card.list", targetType: "card", context: { listId } },
  );
}

export async function POST(request: Request, { params }: Params) {
  const { listId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const list = await resolveBoardFromList(listId);
      await assertBoardAccess(user.id, list.boardId, "member");
      const { title } = parseCardCreate(body);
      const created = await prisma.$transaction(async (tx) => {
        const max = await tx.card.aggregate({
          where: { listId },
          _max: { order: true },
        });
        const nextOrder = (max._max.order ?? -1) + 1;
        return tx.card.create({
          data: { listId, title, description: "", order: nextOrder },
        });
      });
      return NextResponse.json(created, { status: 201 });
    },
    { event: "card.create", targetType: "card", context: { listId } },
  );
}
