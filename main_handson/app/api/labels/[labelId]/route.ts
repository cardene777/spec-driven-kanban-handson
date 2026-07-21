// spec/006_label.md § API（ラベル編集・削除）
import { NextRequest, NextResponse } from "next/server";
import { labelRepository } from "@/lib/repository/label";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import { isLabelColor, type LabelColor } from "@/lib/labelColors";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ labelId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { labelId } = await ctx.params;
    const label = await labelRepository.findById(labelId);
    if (!label) return notFound("指定されたラベルが見つかりません");
    const access = await checkBoardAccess(label.boardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたラベルが見つかりません");
    if (accessErr) return accessErr;

    const body = (await req.json().catch(() => ({}))) as {
      name?: unknown;
      color?: unknown;
    };
    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasColor = Object.prototype.hasOwnProperty.call(body, "color");
    if (!hasName && !hasColor) {
      return validationError("nameまたはcolorを指定してください", { _root: "no_fields" });
    }

    const patch: { name?: string; color?: LabelColor } = {};
    if (hasName) {
      const name = validateTitle(body.name, 50);
      if (!name.ok) {
        return validationError("nameは1〜50文字で入力してください", { name: name.reason });
      }
      patch.name = name.value;
    }
    if (hasColor) {
      if (!isLabelColor(body.color)) {
        return validationError("colorは事前定義色のいずれかを指定してください", {
          color: "invalid",
        });
      }
      patch.color = body.color;
    }

    const updated = await labelRepository.update(labelId, patch);
    auditLog(requestId, "label.update", { labelId });
    return NextResponse.json(updated);
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { labelId } = await ctx.params;
    const label = await labelRepository.findById(labelId);
    if (!label) return notFound("指定されたラベルが見つかりません");
    const access = await checkBoardAccess(label.boardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたラベルが見つかりません");
    if (accessErr) return accessErr;
    await labelRepository.delete(labelId);
    auditLog(requestId, "label.delete", { labelId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
