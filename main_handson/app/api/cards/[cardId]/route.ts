// spec/003_cards.md § API / design/003_cards.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";
import { parseCardUpdate } from "@/lib/schemas/cards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { cardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "viewer");
      const full = await prisma.card.findUnique({ where: { id: cardId } });
      return NextResponse.json(full, { status: 200 });
    },
    { event: "card.get", targetType: "card", targetId: cardId },
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const { cardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const parsed = parseCardUpdate(body);
      const data: { title?: string; description?: string } = {};
      if (parsed.title !== undefined) data.title = parsed.title;
      if (parsed.description !== undefined) data.description = parsed.description;
      const updated = await prisma.card.update({
        where: { id: cardId },
        data,
      });
      return NextResponse.json(updated, { status: 200 });
    },
    { event: "card.update", targetType: "card", targetId: cardId },
  );
}

export async function DELETE(request: Request, { params }: Params) {
  const { cardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      await prisma.$transaction(async (tx) => {
        await tx.card.delete({ where: { id: cardId } });
        await tx.card.updateMany({
          where: { listId: card.listId, order: { gt: card.order } },
          data: { order: { decrement: 1 } },
        });
      });
      return new NextResponse(null, { status: 204 });
    },
    { event: "card.delete", targetType: "card", targetId: cardId },
  );
}
