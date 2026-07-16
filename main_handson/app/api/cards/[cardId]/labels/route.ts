// spec/006_label.md § API / design/006_label.md § API 設計 (カード配下のラベル一覧)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

// GET /api/cards/{cardId}/labels … カードに付与されたラベル一覧 (viewer 以上)
export async function GET(request: Request, { params }: Params) {
  const { cardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "viewer");
      const items = await prisma.label.findMany({
        where: { cardLabels: { some: { cardId } } },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "card.label.list", targetType: "card", targetId: cardId, context: { cardId } },
  );
}
