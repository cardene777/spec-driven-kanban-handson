// spec/007_due_date.md § API / design/007_due_date.md § API 設計 (期限の設定 / 変更 / 解除)
//
// 実コードベースへの適合メモ: design は Card.status (active/archived/deleted) 前提で
// status !== active を 422 invalid_state とするが、本コードベースにはアーカイブ機能
// (spec/004) が未実装で status 列が存在しない。そのため状態エラー分岐は設けていない
// (アーカイブ / 削除済みカード自体が存在しない)。
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";
import { parseDueDateUpdate } from "@/lib/schemas/dueDate";
import { fromDateOnly, serializeCard } from "@/lib/dueDate/serialize";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

// PATCH /api/cards/{cardId}/due-date … 期限を設定 / 変更 / 解除 (member 以上)
export async function PATCH(request: Request, { params }: Params) {
  const { cardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const { dueDate } = parseDueDateUpdate(body);
      const updated = await prisma.card.update({
        where: { id: cardId },
        data: { dueDate: fromDateOnly(dueDate) },
      });
      return NextResponse.json(serializeCard(updated), { status: 200 });
    },
    { event: "card.due-date.update", targetType: "card", targetId: cardId, context: { cardId } },
  );
}
