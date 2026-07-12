// spec/001_boards.md § API / design/001_boards.md § API 設計
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import { assertBoardAccess } from "@/lib/auth/boardAccess";
import { parseBoardUpdate } from "@/lib/schemas/boards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { boardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const { board } = await assertBoardAccess(user.id, boardId, "viewer");
      return NextResponse.json(board, { status: 200 });
    },
    { event: "board.get", targetType: "board", targetId: boardId },
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const { boardId } = await params;
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const { board } = await assertBoardAccess(user.id, boardId, "owner");
      const { title } = parseBoardUpdate(body);
      const updated = await prisma.board.update({
        where: { id: boardId },
        data: { title },
      });
      return NextResponse.json(updated, {
        status: 200,
        headers: { "x-old-title": board.title },
      });
    },
    { event: "board.update", targetType: "board", targetId: boardId },
  );
}

export async function DELETE(request: Request, { params }: Params) {
  const { boardId } = await params;
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const { board } = await assertBoardAccess(user.id, boardId, "owner");
      await prisma.board.delete({ where: { id: boardId } });
      return new NextResponse(null, {
        status: 204,
        headers: { "x-deleted-title": board.title },
      });
    },
    { event: "board.delete", targetType: "board", targetId: boardId },
  );
}
