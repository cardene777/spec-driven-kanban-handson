// spec/009_assignee.md § API / design/009_assignee.md § API 設計 (GET / POST)
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";
import { parseAssigneeCreate } from "@/lib/schemas/assignees";
import { assertBelowLimit } from "@/lib/assignees/limit";
import { ConflictError, ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

// GET /api/cards/{cardId}/assignees … 担当者一覧 (viewer 以上)
export async function GET(request: Request, { params }: Params) {
  const { cardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "viewer");
      const items = await prisma.cardAssignee.findMany({
        where: { cardId },
        orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
      });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "card.assignee.list", targetType: "card", targetId: cardId, context: { cardId } },
  );
}

// POST /api/cards/{cardId}/assignees … 担当者追加 (member 以上)
export async function POST(request: Request, { params }: Params) {
  const { cardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const { userId } = parseAssigneeCreate(body);

      const created = await prisma.$transaction(async (tx) => {
        // 存在検証は「ユーザー存在 → ボード所属 → 上限」 の順 (design § セキュリティ)
        const target = await tx.user.findUnique({ where: { id: userId } });
        if (!target) throw new ValidationError({ userId: "assignee_not_found" });

        const membership = await tx.boardMembership.findUnique({
          where: { boardId_userId: { boardId: card.boardId, userId } },
          select: { role: true },
        });
        if (!membership) throw new ValidationError({ userId: "assignee_not_in_board" });

        const count = await tx.cardAssignee.count({ where: { cardId } });
        assertBelowLimit(count);

        try {
          const assignment = await tx.cardAssignee.create({
            data: { cardId, userId },
          });
          // Card.updatedAt を空更新で強制 (@updatedAt は update 呼出で更新)
          await tx.card.update({ where: { id: cardId }, data: {} });
          return assignment;
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            throw new ConflictError({ userId: "already_assigned" });
          }
          throw err;
        }
      });

      return NextResponse.json(created, { status: 201 });
    },
    { event: "card.assignee.add", targetType: "card", targetId: cardId, context: { cardId } },
  );
}
