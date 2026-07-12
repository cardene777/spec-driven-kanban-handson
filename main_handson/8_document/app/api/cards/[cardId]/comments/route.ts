// spec/010_comment.md § API / design/010_comment.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromCard } from "@/lib/auth/cardAccess";
import { parseCommentCreate } from "@/lib/schemas/comments";
import { escapeHtml } from "@/lib/comments/escape";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { cardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "viewer");
      const items = await prisma.comment.findMany({
        where: { cardId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "comment.list", targetType: "comment", targetId: cardId, context: { cardId } },
  );
}

export async function POST(request: Request, { params }: Params) {
  const { cardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const card = await resolveBoardFromCard(cardId);
      await assertBoardAccess(user.id, card.boardId, "member");
      const parsed = parseCommentCreate(body);
      const escaped = escapeHtml(parsed.body);
      const created = await prisma.comment.create({
        data: { cardId, authorId: user.id, body: escaped },
      });
      return NextResponse.json(created, { status: 201 });
    },
    { event: "comment.create", targetType: "comment", context: { cardId } },
  );
}
