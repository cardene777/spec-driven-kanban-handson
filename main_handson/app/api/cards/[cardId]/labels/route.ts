// spec/006_label.md § API（カードへのラベル付与）
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { listRepository } from "@/lib/repository/list";
import { labelRepository } from "@/lib/repository/label";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const card = await cardRepository.findById(cardId);
    if (!card) return notFound("指定されたカードが見つかりません");

    const body = (await req.json().catch(() => ({}))) as { labelId?: unknown };
    if (typeof body.labelId !== "string") {
      return validationError("labelIdは必須です", { labelId: "invalid" });
    }
    const label = await labelRepository.findById(body.labelId);
    if (!label) return notFound("指定されたラベルが見つかりません");

    // ラベルはカードと同一ボードに属すること（越境付与を防ぐ）
    const list = await listRepository.findById(card.listId);
    if (!list || list.boardId !== label.boardId) {
      return notFound("指定されたラベルが見つかりません");
    }

    const result = await labelRepository.assign(cardId, body.labelId);
    auditLog(requestId, "label.assign", { cardId, labelId: body.labelId });
    return NextResponse.json(result.link, { status: result.created ? 201 : 200 });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
