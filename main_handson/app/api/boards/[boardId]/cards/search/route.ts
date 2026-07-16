// spec/008_search_filter.md § API / design/008_search_filter.md § API 設計 (検索・絞り込み)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { parseCardSearchQuery } from "@/lib/schemas/cardSearch";
import { buildCardWhere } from "@/lib/search/cardWhere";
import { getServerTodayUtc } from "@/lib/dueDate/status";
import { toDateOnly } from "@/lib/dueDate/serialize";
import { ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string }> };

// GET /api/boards/{boardId}/cards/search … ボード配下カードの検索 / 絞り込み (viewer 以上)
export async function GET(request: Request, { params }: Params) {
  const { boardId } = await params;
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "viewer");

      const parsed = parseCardSearchQuery(raw);

      // labelIds は全て対象ボードに属することを検証する (別ボード / 存在しないは invalid_labels)。
      if (parsed.labelIds.length > 0) {
        const found = await prisma.label.findMany({
          where: { id: { in: parsed.labelIds }, boardId },
          select: { id: true },
        });
        if (found.length !== parsed.labelIds.length) {
          throw new ValidationError({ labelIds: "invalid_labels" });
        }
      }

      const where = buildCardWhere(parsed, {
        boardId,
        userId: user.id,
        today: getServerTodayUtc(),
      });

      const cards = await prisma.card.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        include: {
          list: { select: { id: true, title: true } },
          cardLabels: { include: { label: true } },
        },
      });

      const items = cards.map((card) => {
        const { cardLabels, ...rest } = card;
        return {
          ...rest,
          dueDate: toDateOnly(card.dueDate),
          labels: cardLabels.map((cl) => cl.label),
        };
      });

      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "card.search", targetType: "board", targetId: boardId, context: { boardId } },
  );
}
