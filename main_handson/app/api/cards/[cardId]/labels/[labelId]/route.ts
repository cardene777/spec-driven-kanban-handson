// spec/006_label.md § API / design/006_label.md § API 設計 (ラベル付与 / 解除)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";
import { resolveBoardFromLabel } from "@/lib/auth/labelAccess";
import { NotFoundError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string; labelId: string }> };

// POST /api/cards/{cardId}/labels/{labelId} … ラベル付与 (member 以上、idempotent)
export async function POST(request: Request, { params }: Params) {
  const { cardId, labelId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const label = await resolveBoardFromLabel(labelId);
      // 別ボードのラベルは「アクセスできないリソース」 として 404 (spec § 異常系)
      if (label.boardId !== card.boardId) throw new NotFoundError();

      await prisma.$transaction(async (tx) => {
        await tx.cardLabel.upsert({
          where: { cardId_labelId: { cardId, labelId } },
          create: { cardId, labelId },
          update: {},
        });
        // Card.updatedAt を空更新で強制する。
        await tx.card.update({ where: { id: cardId }, data: {} });
      });

      return new NextResponse(null, { status: 204 });
    },
    { event: "card.label.attach", targetType: "card", targetId: cardId, context: { cardId, labelId } },
  );
}

// DELETE /api/cards/{cardId}/labels/{labelId} … ラベル解除 (member 以上、idempotent)
export async function DELETE(request: Request, { params }: Params) {
  const { cardId, labelId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const label = await resolveBoardFromLabel(labelId);
      if (label.boardId !== card.boardId) throw new NotFoundError();

      await prisma.$transaction(async (tx) => {
        // 未付与でも deleteMany は 0 件削除で成功 (idempotent)。
        await tx.cardLabel.deleteMany({ where: { cardId, labelId } });
        await tx.card.update({ where: { id: cardId }, data: {} });
      });

      return new NextResponse(null, { status: 204 });
    },
    { event: "card.label.detach", targetType: "card", targetId: cardId, context: { cardId, labelId } },
  );
}
