// spec/002_lists.md § API / design/002_lists.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { NotFoundError } from "@/lib/http/errors";
import { parseListUpdate } from "@/lib/schemas/lists";

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
      const { title } = parseListUpdate(body);
      const updated = await prisma.list.update({
        where: { id: listId },
        data: { title },
      });
      return NextResponse.json(updated, { status: 200 });
    },
    { event: "list.update", targetType: "list", targetId: listId },
  );
}

export async function DELETE(request: Request, { params }: Params) {
  const { listId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const list = await prisma.list.findUnique({ where: { id: listId } });
      if (!list) throw new NotFoundError();
      await assertBoardAccess(user.id, list.boardId, "member");
      await prisma.$transaction(async (tx) => {
        await tx.list.delete({ where: { id: listId } });
        await tx.list.updateMany({
          where: { boardId: list.boardId, order: { gt: list.order } },
          data: { order: { decrement: 1 } },
        });
      });
      return new NextResponse(null, { status: 204 });
    },
    { event: "list.delete", targetType: "list", targetId: listId },
  );
}
