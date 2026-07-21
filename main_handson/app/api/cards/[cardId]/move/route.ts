// spec/004_card_movement_archive_restore.md § 操作: カードの並べ替え/移動
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateOrder } from "@/lib/validation/text";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

const MESSAGES: Record<string, string> = {
  not_active: "アーカイブ済み/削除済みのカードは移動できません",
  source_mismatch: "sourceListId が現在のリストと一致しません",
  cross_board: "別ボードのリストへは移動できません",
  order_range: "targetOrder が挿入可能範囲を超えています",
};

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const body = (await req.json().catch(() => ({}))) as {
      sourceListId?: unknown;
      targetListId?: unknown;
      targetOrder?: unknown;
    };
    if (typeof body.sourceListId !== "string" || typeof body.targetListId !== "string") {
      return validationError("sourceListId と targetListId は必須です", {
        _root: "invalid_type",
      });
    }
    const ord = validateOrder(body.targetOrder);
    if (!ord.ok || ord.value < 0) {
      return validationError("targetOrder は 0 以上の整数で指定してください", {
        targetOrder: "invalid",
      });
    }
    const result = await cardRepository.move(
      cardId,
      body.sourceListId,
      body.targetListId,
      ord.value,
    );
    if (result.kind === "not_found") {
      return notFound("指定されたカードまたはリストが見つかりません");
    }
    if (result.kind === "invalid") {
      return validationError(MESSAGES[result.reason] ?? "移動できません", {
        _root: result.reason,
      });
    }
    auditLog(requestId, "card.move", {
      cardId,
      sourceListId: body.sourceListId,
      targetListId: body.targetListId,
      targetOrder: ord.value,
    });
    return NextResponse.json(result.card);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
