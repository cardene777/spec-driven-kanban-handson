// spec/003_cards.md FR-004, FR-005, FR-006
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
import { currentUser } from "@/lib/auth/currentUser";
import { checkBoardAccess } from "@/lib/auth/requireBoardRole";
import { auditLog } from "@/lib/audit/log";
import { validateTitle, validateDescription } from "@/lib/validation/text";
import {
  unauthorized,
  forbidden,
  notFound,
  validationError,
  internalError,
} from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

async function loadCardWithAccess(userId: string, cardId: string, minRole: "viewer" | "member") {
  const card = await cardRepository.findById(cardId);
  if (!card) return { kind: "not_found" as const };
  const list = await listRepository.findById(card.listId);
  if (!list) return { kind: "not_found" as const };
  const access = await checkBoardAccess(userId, list.boardId, minRole);
  if (access.kind === "not_found") return { kind: "not_found" as const };
  if (access.kind === "forbidden") return { kind: "forbidden" as const };
  return { kind: "ok" as const, card, list };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { cardId } = await ctx.params;
    const found = await loadCardWithAccess(user.id, cardId, "viewer");
    if (found.kind === "not_found") return notFound("指定されたカードが見つかりません");
    if (found.kind === "forbidden") return forbidden();
    return NextResponse.json(found.card);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { cardId } = await ctx.params;
    const found = await loadCardWithAccess(user.id, cardId, "member");
    if (found.kind === "not_found") return notFound("指定されたカードが見つかりません");
    if (found.kind === "forbidden") return forbidden();

    const body = (await req.json().catch(() => ({}))) as {
      title?: unknown;
      description?: unknown;
    };

    const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
    const hasDescription = Object.prototype.hasOwnProperty.call(body, "description");
    if (!hasTitle && !hasDescription) {
      return validationError("titleまたはdescriptionを指定してください", {
        _root: "no_fields",
      });
    }

    const patch: { title?: string; description?: string } = {};
    if (hasTitle) {
      const r = validateTitle(body.title, 200);
      if (!r.ok) {
        return validationError("titleは1〜200文字で入力してください", {
          title: r.reason,
        });
      }
      patch.title = r.value;
    }
    if (hasDescription) {
      const r = validateDescription(body.description, 2000);
      if (!r.ok) {
        return validationError("descriptionは0〜2000文字で入力してください", {
          description: r.reason,
        });
      }
      patch.description = r.value;
    }

    const updated = await cardRepository.update(cardId, patch);
    auditLog("card.update", {
      actor: user.id,
      boardId: found.list.boardId,
      listId: found.list.id,
      cardId,
      fields: Object.keys(patch),
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { cardId } = await ctx.params;
    const found = await loadCardWithAccess(user.id, cardId, "member");
    if (found.kind === "not_found") return notFound("指定されたカードが見つかりません");
    if (found.kind === "forbidden") return forbidden();
    await cardRepository.delete(cardId);
    auditLog("card.delete", {
      actor: user.id,
      boardId: found.list.boardId,
      listId: found.list.id,
      cardId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return internalError();
  }
}
