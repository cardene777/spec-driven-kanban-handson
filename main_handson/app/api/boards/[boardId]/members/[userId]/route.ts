// spec/013_permissions.md § FR-02 / FR-03 / FR-04 / design/013_permissions.md § PATCH / DELETE members
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { parseRoleUpdate } from "@/lib/schemas/members";
import { isLastOwnerProtected } from "@/lib/permissions/lastOwner";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string; userId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { boardId, userId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "owner");
      const { role: newRole } = parseRoleUpdate(body);

      const updated = await prisma.$transaction(async (tx) => {
        const target = await tx.boardMembership.findUnique({
          where: { boardId_userId: { boardId, userId } },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        });
        if (!target) throw new NotFoundError();
        if (target.role === newRole) {
          return target;
        }
        const ownerCount = await tx.boardMembership.count({
          where: { boardId, role: "owner" },
        });
        if (
          isLastOwnerProtected({
            currentOwnerCount: ownerCount,
            targetCurrentRole: target.role,
            operation: "change_role",
            newRole,
          })
        ) {
          throw new ValidationError({ role: "last_owner" });
        }
        return tx.boardMembership.update({
          where: { boardId_userId: { boardId, userId } },
          data: { role: newRole },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        });
      });

      return NextResponse.json(
        {
          userId: updated.userId,
          name: updated.user.name,
          email: updated.user.email,
          role: updated.role,
          createdAt: updated.createdAt.toISOString(),
        },
        { status: 200 },
      );
    },
    {
      event: "member.role_change",
      targetType: "member",
      targetId: userId,
      context: { boardId },
    },
  );
}

export async function DELETE(request: Request, { params }: Params) {
  const { boardId, userId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const { role: actorRole } = await assertBoardAccess(
        user.id,
        boardId,
        "viewer",
      );

      await prisma.$transaction(async (tx) => {
        const target = await tx.boardMembership.findUnique({
          where: { boardId_userId: { boardId, userId } },
        });
        if (!target) throw new NotFoundError();
        const isSelf = user.id === userId;
        const isOwner = actorRole === "owner";
        if (!isSelf && !isOwner) throw new ForbiddenError();
        const ownerCount = await tx.boardMembership.count({
          where: { boardId, role: "owner" },
        });
        if (
          isLastOwnerProtected({
            currentOwnerCount: ownerCount,
            targetCurrentRole: target.role,
            operation: "remove",
          })
        ) {
          throw new ValidationError({ userId: "last_owner" });
        }
        await tx.boardMembership.delete({
          where: { boardId_userId: { boardId, userId } },
        });
      });
      return new NextResponse(null, { status: 204 });
    },
    {
      event: "member.remove",
      targetType: "member",
      targetId: userId,
      context: { boardId },
    },
  );
}
