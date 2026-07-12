// spec/012_member_invite.md § FR-04 / design/012_member_invite.md § POST resend
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from "@/lib/invites/token";
import { NotFoundError, ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string; inviteId: string }> };

function inviteWithoutHash<T extends { tokenHash?: string }>(inv: T) {
  const clone = { ...inv } as Record<string, unknown>;
  delete clone.tokenHash;
  return clone;
}

function inviteUrl(token: string): string {
  const base = process.env.APP_BASE_URL ?? "";
  return `${base}/invites/${token}`;
}

export async function POST(request: Request, { params }: Params) {
  const { boardId, inviteId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "owner");

      const result = await prisma.$transaction(async (tx) => {
        const invite = await tx.invite.findUnique({ where: { id: inviteId } });
        if (!invite || invite.boardId !== boardId) throw new NotFoundError();
        if (invite.status !== "pending") {
          throw new ValidationError({ status: "not_pending" });
        }
        const token = generateInviteToken();
        const tokenHash = hashInviteToken(token);
        const expiresAt = inviteExpiresAt();
        const updated = await tx.invite.update({
          where: { id: inviteId },
          data: { tokenHash, expiresAt },
        });
        return { invite: updated, token };
      });
      const res = NextResponse.json(
        {
          invite: inviteWithoutHash(result.invite),
          token: result.token,
          url: inviteUrl(result.token),
        },
        { status: 200 },
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    {
      event: "invite.resend",
      targetType: "invite",
      targetId: inviteId,
      context: { boardId },
    },
  );
}
