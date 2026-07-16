// spec/006_label.md § API / design/006_label.md § API 設計 (PATCH 編集 / DELETE 削除)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromLabel } from "@/lib/auth/labelAccess";
import { parseLabelUpdate } from "@/lib/schemas/labels";
import { isUniqueConstraintError } from "@/lib/http/prismaErrors";
import { ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ labelId: string }> };

// PATCH /api/labels/{labelId} … ラベル名 / 色の更新 (member 以上)
export async function PATCH(request: Request, { params }: Params) {
  const { labelId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const label = await resolveBoardFromLabel(labelId);
      await assertBoardAccess(user.id, label.boardId, "member");
      const updates = parseLabelUpdate(body);
      try {
        const updated = await prisma.label.update({
          where: { id: labelId },
          data: updates,
        });
        return NextResponse.json(updated, { status: 200 });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new ValidationError({ name: "duplicate_name" });
        }
        throw err;
      }
    },
    { event: "label.update", targetType: "board", targetId: labelId, context: { labelId } },
  );
}

// DELETE /api/labels/{labelId} … ラベル削除 (member 以上、CardLabel はカスケード解除)
export async function DELETE(request: Request, { params }: Params) {
  const { labelId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const label = await resolveBoardFromLabel(labelId);
      await assertBoardAccess(user.id, label.boardId, "member");
      // CardLabel は onDelete: Cascade で自動的に解除される。
      await prisma.label.delete({ where: { id: labelId } });
      return new NextResponse(null, { status: 204 });
    },
    { event: "label.delete", targetType: "board", targetId: labelId, context: { labelId } },
  );
}
