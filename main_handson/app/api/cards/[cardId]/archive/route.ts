// spec/004_card_movement_archive_restore.md § 操作: カードのアーカイブ
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const result = await cardRepository.setState(cardId, "archivedAt");
    if (result.kind === "not_found") return notFound("指定されたカードが見つかりません");
    if (result.kind === "invalid") {
      return validationError("削除済みのカードはアーカイブできません（先に復元が必要）", {
        _root: result.reason,
      });
    }
    auditLog(requestId, "card.archive", { cardId });
    return NextResponse.json(result.card);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
