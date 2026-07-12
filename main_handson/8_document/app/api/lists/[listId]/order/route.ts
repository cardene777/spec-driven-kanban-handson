// spec/002_lists.md § 並び替え / design/002_lists.md § PATCH /api/lists/{listId}/order
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { NotFoundError, ValidationError } from "@/lib/http/errors";
import { parseListOrder } from "@/lib/schemas/lists";
import { planReorder, validateReorderIndex } from "@/lib/order/list";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ listId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { listId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const list = await prisma.list.findUnique({ where: { id: listId } });
      if (!list) throw new NotFoundError();
      await assertBoardAccess(user.id, list.boardId, "member");
      const { toIndex } = parseListOrder(body);
      const count = await prisma.list.count({
        where: { boardId: list.boardId },
      });
      const err = validateReorderIndex(toIndex, count);
      if (err) throw new ValidationError({ toIndex: err });
      const target = toIndex as number;

      const updated = await prisma.$transaction(async (tx) => {
        const plan = planReorder(list.order, target);
        if (plan.kind === "noop") {
          return tx.list.update({
            where: { id: listId },
            data: { updatedAt: new Date() },
          });
        }
        // @@unique([boardId, order]) 衝突回避のため対象を一時値 (-1) に退避
        await tx.list.update({
          where: { id: listId },
          data: { order: -1 },
        });
        if (plan.shiftDirection === "down") {
          await tx.list.updateMany({
            where: {
              boardId: list.boardId,
              order: { gte: plan.shiftRangeStart, lte: plan.shiftRangeEnd },
            },
            data: { order: { decrement: 1 } },
          });
        } else {
          await tx.list.updateMany({
            where: {
              boardId: list.boardId,
              order: { gte: plan.shiftRangeStart, lte: plan.shiftRangeEnd },
            },
            data: { order: { increment: 1 } },
          });
        }
        return tx.list.update({
          where: { id: listId },
          data: { order: target, updatedAt: new Date() },
        });
      });
      return NextResponse.json(updated, { status: 200 });
    },
    {
      event: "list.reorder",
      targetType: "list",
      targetId: listId,
      context: { toIndex: (body as { toIndex?: unknown })?.toIndex },
    },
  );
}
