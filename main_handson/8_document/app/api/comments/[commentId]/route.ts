// spec/010_comment.md § API / design/010_comment.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { resolveBoardFromComment } from "@/lib/auth/commentAccess";
import { canDeleteComment } from "@/lib/auth/canDeleteComment";
import { ForbiddenError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ commentId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const { commentId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const comment = await resolveBoardFromComment(commentId);
      const { role } = await assertBoardAccess(user.id, comment.boardId, "viewer");
      if (
        !canDeleteComment({
          actorId: user.id,
          authorId: comment.authorId,
          actorRole: role,
        })
      ) {
        throw new ForbiddenError();
      }
      await prisma.comment.delete({ where: { id: commentId } });
      return new NextResponse(null, { status: 204 });
    },
    {
      event: "comment.delete",
      targetType: "comment",
      targetId: commentId,
      context: { commentId },
    },
  );
}
