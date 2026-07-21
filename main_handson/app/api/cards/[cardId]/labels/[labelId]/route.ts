// spec/006_label.md § API（カードからのラベル解除）
import { NextRequest, NextResponse } from "next/server";
import { cardRepository } from "@/lib/repository/card";
import { labelRepository } from "@/lib/repository/label";
import { checkCardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ cardId: string; labelId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { cardId, labelId } = await ctx.params;
    const access = await checkCardAccess(cardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたカードが見つかりません");
    if (accessErr) return accessErr;

    const card = await cardRepository.findById(cardId);
    if (!card) return notFound("指定されたカードが見つかりません");
    await labelRepository.unassign(cardId, labelId);
    auditLog(requestId, "label.unassign", { cardId, labelId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
