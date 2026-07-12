// spec/012_member_invite.md § API / design/012_member_invite.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { parseInviteCreate } from "@/lib/schemas/invites";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from "@/lib/invites/token";
import { ValidationError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string }> };

function inviteWithoutHash<T extends { tokenHash?: string }>(inv: T) {
  const clone = { ...inv } as Record<string, unknown>;
  delete clone.tokenHash;
  return clone;
}

function inviteUrl(token: string): string {
  const base = process.env.APP_BASE_URL ?? "";
  return `${base}/invites/${token}`;
}

export async function GET(request: Request, { params }: Params) {
  const { boardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "owner");
      const invites = await prisma.invite.findMany({
        where: { boardId, status: "pending" },
        orderBy: [{ createdAt: "desc" }],
      });
      const items = invites.map(inviteWithoutHash);
      const res = NextResponse.json({ items }, { status: 200 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    {
      event: "invite.list",
      targetType: "invite",
      targetId: null,
      context: { boardId },
    },
  );
}

export async function POST(request: Request, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "owner");
      const parsed = parseInviteCreate(body);
      const emailLower = parsed.email.toLowerCase();

      const result = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: emailLower },
          select: { id: true },
        });
        if (existingUser) {
          const m = await tx.boardMembership.findUnique({
            where: {
              boardId_userId: { boardId, userId: existingUser.id },
            },
            select: { userId: true },
          });
          if (m) {
            throw new ValidationError({ email: "already_member" });
          }
        }
        const pending = await tx.invite.count({
          where: { boardId, email: emailLower, status: "pending" },
        });
        if (pending > 0) {
          throw new ValidationError({ email: "pending_exists" });
        }
        const token = generateInviteToken();
        const tokenHash = hashInviteToken(token);
        const expiresAt = inviteExpiresAt();
        const invite = await tx.invite.create({
          data: {
            boardId,
            email: emailLower,
            role: parsed.role,
            tokenHash,
            expiresAt,
            invitedBy: user.id,
          },
        });
        return { invite, token };
      });
      const res = NextResponse.json(
        {
          invite: inviteWithoutHash(result.invite),
          token: result.token,
          url: inviteUrl(result.token),
        },
        { status: 201 },
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    {
      event: "invite.create",
      targetType: "invite",
      context: { boardId, email: (body as { email?: string })?.email },
    },
  );
}
