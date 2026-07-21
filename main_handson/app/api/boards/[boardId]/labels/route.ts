// spec/006_label.md § API（ラベル一覧取得・作成）
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { labelRepository } from "@/lib/repository/label";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle } from "@/lib/validation/text";
import { isLabelColor } from "@/lib/labelColors";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "viewer");
    const accessErr = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (accessErr) return accessErr;

    const board = await boardRepository.findById(boardId);
    if (!board) return notFound("指定されたボードが見つかりません");
    const labels = await labelRepository.listByBoard(boardId);
    return NextResponse.json({ items: labels });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "member");
    const accessErr = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (accessErr) return accessErr;

    const board = await boardRepository.findById(boardId);
    if (!board) return notFound("指定されたボードが見つかりません");
    const body = (await req.json().catch(() => ({}))) as {
      name?: unknown;
      color?: unknown;
    };
    const name = validateTitle(body.name, 50);
    if (!name.ok) {
      return validationError("nameは1〜50文字で入力してください", { name: name.reason });
    }
    if (!isLabelColor(body.color)) {
      return validationError("colorは事前定義色のいずれかを指定してください", {
        color: "invalid",
      });
    }
    const label = await labelRepository.create(boardId, name.value, body.color);
    auditLog(requestId, "label.create", { boardId, labelId: label.id });
    return NextResponse.json(label, { status: 201 });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
