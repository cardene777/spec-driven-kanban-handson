// spec/006_label.md § API / design/006_label.md § API 設計 (GET 一覧 / POST 作成)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { parseLabelCreate } from "@/lib/schemas/labels";
import { isUniqueConstraintError } from "@/lib/http/prismaErrors";
import { ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string }> };

// GET /api/boards/{boardId}/labels … ラベル一覧 (viewer 以上)、name 昇順
export async function GET(request: Request, { params }: Params) {
  const { boardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "viewer");
      const items = await prisma.label.findMany({
        where: { boardId },
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      });
      return NextResponse.json({ items }, { status: 200 });
    },
    { event: "label.list", targetType: "board", targetId: boardId, context: { boardId } },
  );
}

// POST /api/boards/{boardId}/labels … ラベル作成 (member 以上)
export async function POST(request: Request, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "member");
      const { name, color } = parseLabelCreate(body);
      try {
        const created = await prisma.label.create({
          data: { boardId, name, color },
        });
        return NextResponse.json(created, { status: 201 });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new ValidationError({ name: "duplicate_name" });
        }
        throw err;
      }
    },
    { event: "label.create", targetType: "board", targetId: boardId, context: { boardId } },
  );
}
