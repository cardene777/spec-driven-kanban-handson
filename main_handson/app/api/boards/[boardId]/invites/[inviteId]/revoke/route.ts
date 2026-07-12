// spec/012_member_invite.md § FR-05 / design/012_member_invite.md § POST revoke
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { NotFoundError, ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string; inviteId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { boardId, inviteId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "owner");

      const updated = await prisma.$transaction(async (tx) => {
        const invite = await tx.invite.findUnique({ where: { id: inviteId } });
        if (!invite || invite.boardId !== boardId) throw new NotFoundError();
        if (invite.status !== "pending") {
          throw new ValidationError({ status: "not_pending" });
        }
        return tx.invite.update({
          where: { id: inviteId },
          data: { status: "revoked" },
        });
      });
      return NextResponse.json(
        { invite: { id: updated.id, status: updated.status } },
        { status: 200 },
      );
    },
    {
      event: "invite.revoke",
      targetType: "invite",
      targetId: inviteId,
      context: { boardId },
    },
  );
}
