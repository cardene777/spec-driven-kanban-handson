// spec/004_card_movement_archive_restore.md § 操作: カードの削除復元
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const result = await cardRepository.clearState(cardId, "deletedAt");
    if (result.kind === "not_found") return notFound("指定されたカードが見つかりません");
    auditLog(requestId, "card.restore", { cardId });
    return NextResponse.json(result.kind === "ok" ? result.card : null);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
