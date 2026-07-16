// spec/009_assignee.md § API / design/009_assignee.md § API 設計 (DELETE)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";
import { NotFoundError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string; userId: string }> };

// DELETE /api/cards/{cardId}/assignees/{userId} … 担当者削除 (member 以上、物理削除)
export async function DELETE(request: Request, { params }: Params) {
  const { cardId, userId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");

      await prisma.$transaction(async (tx) => {
        const assignment = await tx.cardAssignee.findUnique({
          where: { cardId_userId: { cardId, userId } },
        });
        if (!assignment) throw new NotFoundError();
        await tx.cardAssignee.delete({
          where: { cardId_userId: { cardId, userId } },
        });
        await tx.card.update({ where: { id: cardId }, data: {} });
      });

      return new NextResponse(null, { status: 204 });
    },
    { event: "card.assignee.remove", targetType: "card", targetId: cardId, context: { cardId, userId } },
  );
}
