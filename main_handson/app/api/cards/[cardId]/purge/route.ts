// spec/004_card_movement_archive_restore.md § 操作: カードの完全削除（purge）
// 権限: owner（spec/013_permissions.md）。
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "owner");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const result = await cardRepository.purge(cardId);
    if (result.kind === "not_found") return notFound("指定されたカードが見つかりません");
    if (result.kind === "invalid") {
      return validationError("ゴミ箱内（削除済み）のカードのみ完全削除できます", {
        _root: result.reason,
      });
    }
    auditLog(requestId, "card.purge", { cardId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
