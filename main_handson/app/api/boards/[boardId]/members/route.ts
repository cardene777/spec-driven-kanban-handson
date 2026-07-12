// spec/013_permissions.md § FR-01 / design/013_permissions.md § GET members
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { sortMembers } from "@/lib/permissions/sortMembers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { boardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      await assertBoardAccess(user.id, boardId, "viewer");
      const memberships = await prisma.boardMembership.findMany({
        where: { boardId },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });
      const flat = memberships.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt,
      }));
      const items = sortMembers(flat).map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }));
      return NextResponse.json({ items }, { status: 200 });
    },
    {
      event: "member.list",
      targetType: "member",
      targetId: null,
      context: { boardId },
    },
  );
}
