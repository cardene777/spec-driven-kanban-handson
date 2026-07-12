// spec/012_member_invite.md § FR-03 / design/012_member_invite.md § POST /api/invites/{token}/accept
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { hashInviteToken, isExpired } from "@/lib/invites/token";
import {
  ConflictError,
  GoneError,
  NotFoundError,
} from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const tokenHash = hashInviteToken(token);
      const result = await prisma.$transaction(async (tx) => {
        const invite = await tx.invite.findUnique({ where: { tokenHash } });
        if (!invite) throw new NotFoundError();
        if (invite.status === "accepted") {
          throw new GoneError("already_used");
        }
        if (invite.status === "revoked") {
          throw new GoneError("revoked");
        }
        if (isExpired(invite.expiresAt)) {
          throw new GoneError("expired");
        }
        const existing = await tx.boardMembership.findUnique({
          where: {
            boardId_userId: { boardId: invite.boardId, userId: user.id },
          },
        });
        if (existing) {
          throw new ConflictError({ userId: "already_member" });
        }
        await tx.boardMembership.create({
          data: {
            boardId: invite.boardId,
            userId: user.id,
            role: invite.role,
          },
        });
        await tx.invite.update({
          where: { id: invite.id },
          data: { status: "accepted" },
        });
        return { boardId: invite.boardId, role: invite.role, inviteId: invite.id };
      });
      const res = NextResponse.json(
        { boardId: result.boardId, role: result.role },
        { status: 200 },
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    {
      event: "invite.accept",
      targetType: "invite",
    },
  );
}
