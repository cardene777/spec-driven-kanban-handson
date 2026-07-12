// spec/002_lists.md § API / design/002_lists.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { parseListCreate } from "@/lib/schemas/lists";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { boardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "viewer");
      const items = await prisma.list.findMany({
        where: { boardId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "list.list", targetType: "list", context: { boardId } },
  );
}

export async function POST(request: Request, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "member");
      const { title } = parseListCreate(body);
      const created = await prisma.$transaction(async (tx) => {
        const max = await tx.list.aggregate({
          where: { boardId },
          _max: { order: true },
        });
        const nextOrder = (max._max.order ?? -1) + 1;
        return tx.list.create({
          data: { boardId, title, order: nextOrder },
        });
      });
      return NextResponse.json(created, { status: 201 });
    },
    { event: "list.create", targetType: "list", context: { boardId } },
  );
}
