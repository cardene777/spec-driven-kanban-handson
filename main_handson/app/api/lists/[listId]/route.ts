// spec/002_lists.md FR-004, FR-005
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { currentUser } from "@/lib/auth/currentUser";
import { checkBoardAccess } from "@/lib/auth/requireBoardRole";
import { auditLog } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import {
  unauthorized,
  forbidden,
  notFound,
  validationError,
  internalError,
} from "@/lib/errors";

type Ctx = { params: Promise<{ listId: string }> };

async function loadListWithAccess(userId: string, listId: string, minRole: "viewer" | "member") {
  const list = await listRepository.findById(listId);
  if (!list) return { kind: "not_found" as const };
  const access = await checkBoardAccess(userId, list.boardId, minRole);
  if (access.kind === "not_found") return { kind: "not_found" as const };
  if (access.kind === "forbidden") return { kind: "forbidden" as const };
  return { kind: "ok" as const, list };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { listId } = await ctx.params;
    const found = await loadListWithAccess(user.id, listId, "member");
    if (found.kind === "not_found") return notFound("指定されたリストが見つかりません");
    if (found.kind === "forbidden") return forbidden();
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 100);
    if (!result.ok) {
      return validationError("titleは1〜100文字で入力してください", {
        title: result.reason,
      });
    }
    const list = await listRepository.updateTitle(listId, result.value);
    auditLog("list.update", {
      actor: user.id,
      boardId: list.boardId,
      listId: list.id,
      title: list.title,
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { listId } = await ctx.params;
    const found = await loadListWithAccess(user.id, listId, "member");
    if (found.kind === "not_found") return notFound("指定されたリストが見つかりません");
    if (found.kind === "forbidden") return forbidden();
    await listRepository.delete(listId);
    auditLog("list.delete", {
      actor: user.id,
      boardId: found.list.boardId,
      listId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
