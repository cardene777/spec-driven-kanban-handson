// spec/004_card_movement_archive_restore.md § 操作: リストの並べ替え
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { checkListAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateOrder } from "@/lib/validation/text";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ listId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { listId } = await ctx.params;
    const access = await checkListAccess(listId, "member");
    const accessErr = accessErrorResponse(access, "指定されたリストが見つかりません");
    if (accessErr) return accessErr;

    const body = (await req.json().catch(() => ({}))) as { targetOrder?: unknown };
    const ord = validateOrder(body.targetOrder);
    if (!ord.ok || ord.value < 0) {
      return validationError("targetOrder は 0 以上の整数で指定してください", {
        targetOrder: "invalid",
      });
    }
    const result = await listRepository.move(listId, ord.value);
    if (result.kind === "not_found") return notFound("指定されたリストが見つかりません");
    if (result.kind === "invalid") {
      return validationError("targetOrder が挿入可能範囲を超えています", {
        _root: result.reason,
      });
    }
    auditLog(requestId, "list.move", { listId, targetOrder: ord.value });
    return NextResponse.json(result.list);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
