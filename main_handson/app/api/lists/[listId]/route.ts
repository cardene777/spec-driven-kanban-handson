// spec/002_lists.md § API（リスト名編集・並び順変更・削除）/ spec/013_permissions.md
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { checkListAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle, validateOrder } from "@/lib/validation/text";
import { validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ listId: string }> };
const NOT_FOUND_MESSAGE = "指定されたリストが見つかりません";

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { listId } = await ctx.params;
    const access = await checkListAccess(listId, "member");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    const body = (await req.json().catch(() => ({}))) as {
      title?: unknown;
      order?: unknown;
    };
    const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
    const hasOrder = Object.prototype.hasOwnProperty.call(body, "order");
    if (!hasTitle && !hasOrder) {
      return validationError("titleまたはorderを指定してください", {
        _root: "no_fields",
      });
    }

    const patch: { title?: string; order?: number } = {};
    if (hasTitle) {
      const r = validateTitle(body.title, 100);
      if (!r.ok) {
        return validationError("titleは1〜100文字で入力してください", {
          title: r.reason,
        });
      }
      patch.title = r.value;
    }
    if (hasOrder) {
      const r = validateOrder(body.order);
      if (!r.ok) {
        return validationError("orderは整数で指定してください", { order: r.reason });
      }
      patch.order = r.value;
    }

    const updated = await listRepository.update(listId, patch);
    auditLog(requestId, "list.update", {
      boardId: updated.boardId,
      listId,
      fields: Object.keys(patch),
    });
    return NextResponse.json(updated);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { listId } = await ctx.params;
    const access = await checkListAccess(listId, "member");
    const err = accessErrorResponse(access, NOT_FOUND_MESSAGE);
    if (err) return err;

    const list = await listRepository.findById(listId);
    await listRepository.delete(listId);
    auditLog(requestId, "list.delete", { boardId: list?.boardId, listId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
