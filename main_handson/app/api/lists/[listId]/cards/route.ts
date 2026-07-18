// spec/003_cards.md FR-001, FR-003
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
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

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { listId } = await ctx.params;
    const found = await loadListWithAccess(user.id, listId, "viewer");
    if (found.kind === "not_found") return notFound("指定されたリストが見つかりません");
    if (found.kind === "forbidden") return forbidden();
    const cards = await cardRepository.findByList(listId);
    return NextResponse.json({ items: cards });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { listId } = await ctx.params;
    const found = await loadListWithAccess(user.id, listId, "member");
    if (found.kind === "not_found") return notFound("指定されたリストが見つかりません");
    if (found.kind === "forbidden") return forbidden();
    const body = (await req.json().catch(() => ({}))) as { title?: unknown };
    const result = validateTitle(body.title, 200);
    if (!result.ok) {
      return validationError("titleは1〜200文字で入力してください", {
        title: result.reason,
      });
    }
    const card = await cardRepository.create(listId, result.value);
    auditLog("card.create", {
      actor: user.id,
      boardId: found.list.boardId,
      listId,
      cardId: card.id,
      title: card.title,
    });
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
