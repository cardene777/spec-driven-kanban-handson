// spec/003_cards.md / 005_card_detail.md / 007_due_date.md § API
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import {
  validateTitle,
  validateDescription,
  validateOrder,
  validateDueDate,
} from "@/lib/validation/text";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

// spec/005: カード詳細（card + labels + dueDate）
export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "viewer");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const detail = await cardRepository.findByIdWithDetail(cardId);
    if (!detail) return notFound("指定されたカードが見つかりません");
    return NextResponse.json(detail);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const card = await cardRepository.findById(cardId);
    if (!card) return notFound("指定されたカードが見つかりません");

    const body = (await req.json().catch(() => ({}))) as {
      title?: unknown;
      description?: unknown;
      order?: unknown;
      dueDate?: unknown;
    };
    const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
    const hasDescription = Object.prototype.hasOwnProperty.call(body, "description");
    const hasOrder = Object.prototype.hasOwnProperty.call(body, "order");
    const hasDueDate = Object.prototype.hasOwnProperty.call(body, "dueDate");
    if (!hasTitle && !hasDescription && !hasOrder && !hasDueDate) {
      return validationError("title・description・order・dueDateのいずれかを指定してください", {
        _root: "no_fields",
      });
    }

    const patch: {
      title?: string;
      description?: string;
      order?: number;
      dueDate?: Date | null;
    } = {};
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
    if (hasOrder) {
      const r = validateOrder(body.order);
      if (!r.ok) {
        return validationError("orderは整数で指定してください", {
          order: r.reason,
        });
      }
      patch.order = r.value;
    }
    if (hasDueDate) {
      const r = validateDueDate(body.dueDate);
      if (!r.ok) {
        return validationError("dueDateは YYYY-MM-DD 形式の日付または null で指定してください", {
          dueDate: "invalid",
        });
      }
      patch.dueDate = r.value;
    }

    const updated = await cardRepository.update(cardId, patch);
    auditLog(requestId, "card.update", {
      listId: updated.listId,
      cardId,
      fields: Object.keys(patch),
    });
    return NextResponse.json(updated);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

// spec/004: DELETE はソフト削除に再定義（deletedAt 設定・復元可能）
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const result = await cardRepository.setState(cardId, "deletedAt");
    if (result.kind === "not_found") return notFound("指定されたカードが見つかりません");
    if (result.kind === "invalid") {
      return validationError("アーカイブ済みのカードは削除できません（先にアーカイブ復元が必要）", {
        _root: result.reason,
      });
    }
    auditLog(requestId, "card.softDelete", { cardId });
    return NextResponse.json(result.card);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
