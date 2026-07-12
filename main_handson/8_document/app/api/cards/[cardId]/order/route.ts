// spec/003_cards.md § 並び替え / design/003_cards.md § PATCH /api/cards/{cardId}/order
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import {
  resolveBoardFromCard,
  resolveBoardFromList,
} from "@/lib/auth/cardAccess";
import { NotFoundError, ValidationError } from "@/lib/http/errors";
import { parseCardOrder } from "@/lib/schemas/cards";
import { planReorder } from "@/lib/order/list";
import { validateCardReorderIndex } from "@/lib/order/card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { cardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const { toListId, toIndex } = parseCardOrder(body);
      if (typeof toListId !== "string") {
        throw new ValidationError({ toListId: "invalid_type" });
      }
      const toList = await resolveBoardFromList(toListId);
      if (toList.boardId !== card.boardId) throw new NotFoundError();

      const sameList = toList.id === card.listId;
      const sameListCount = sameList
        ? await prisma.card.count({ where: { listId: card.listId } })
        : 0;
      const toListCount = sameList
        ? sameListCount
        : await prisma.card.count({ where: { listId: toList.id } });

      const verr = validateCardReorderIndex(toIndex, {
        sameList,
        sameListCount,
        toListCount,
      });
      if (verr) throw new ValidationError({ toIndex: verr });
      const target = toIndex as number;

      const updated = await prisma.$transaction(async (tx) => {
        if (sameList) {
          const plan = planReorder(card.order, target);
          if (plan.kind === "noop") {
            return tx.card.update({
              where: { id: cardId },
              data: { updatedAt: new Date() },
            });
          }
          // @@unique([listId, order]) 衝突回避のため対象を一時値 (-1) に退避
          await tx.card.update({
            where: { id: cardId },
            data: { order: -1 },
          });
          if (plan.shiftDirection === "down") {
            await tx.card.updateMany({
              where: {
                listId: card.listId,
                order: { gte: plan.shiftRangeStart, lte: plan.shiftRangeEnd },
              },
              data: { order: { decrement: 1 } },
            });
          } else {
            await tx.card.updateMany({
              where: {
                listId: card.listId,
                order: { gte: plan.shiftRangeStart, lte: plan.shiftRangeEnd },
              },
              data: { order: { increment: 1 } },
            });
          }
          return tx.card.update({
            where: { id: cardId },
            data: { order: target, updatedAt: new Date() },
          });
        }
        // cross-list: fromList を詰め、 toList を開ける
        await tx.card.update({
          where: { id: cardId },
          data: { order: -1 },
        });
        await tx.card.updateMany({
          where: { listId: card.listId, order: { gt: card.order } },
          data: { order: { decrement: 1 } },
        });
        await tx.card.updateMany({
          where: { listId: toList.id, order: { gte: target } },
          data: { order: { increment: 1 } },
        });
        return tx.card.update({
          where: { id: cardId },
          data: { listId: toList.id, order: target, updatedAt: new Date() },
        });
      });
      return NextResponse.json(updated, { status: 200 });
    },
    { event: "card.reorder", targetType: "card", targetId: cardId },
  );
}
