// spec/003_cards.md § API（カード一覧取得・作成）
import { NextRequest, NextResponse } from "next/server";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
import { checkListAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { validateTitle, validateDescription } from "@/lib/validation/text";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ listId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { listId } = await ctx.params;
    const access = await checkListAccess(listId, "viewer");
    const accessErr = accessErrorResponse(access, "指定されたリストが見つかりません");
    if (accessErr) return accessErr;

    const list = await listRepository.findById(listId);
    if (!list) return notFound("指定されたリストが見つかりません");
    // spec/004: 既定 active、?status で archived/deleted を取得
    const status = new URL(req.url).searchParams.get("status") ?? "active";
    if (status !== "active" && status !== "archived" && status !== "deleted") {
      return validationError("statusは active/archived/deleted のいずれかです", {
        status: "invalid",
      });
    }
    const cards = await cardRepository.findByStatus(listId, status);
    return NextResponse.json({ items: cards });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { listId } = await ctx.params;
    const access = await checkListAccess(listId, "member");
    const accessErr = accessErrorResponse(access, "指定されたリストが見つかりません");
    if (accessErr) return accessErr;

    const list = await listRepository.findById(listId);
    if (!list) return notFound("指定されたリストが見つかりません");

    const body = (await req.json().catch(() => ({}))) as {
      title?: unknown;
      description?: unknown;
    };
    const titleResult = validateTitle(body.title, 200);
    if (!titleResult.ok) {
      return validationError("titleは1〜200文字で入力してください", {
        title: titleResult.reason,
      });
    }
    const descResult = validateDescription(body.description, 2000);
    if (!descResult.ok) {
      return validationError("descriptionは0〜2000文字で入力してください", {
        description: descResult.reason,
      });
    }

    const card = await cardRepository.create(
      listId,
      titleResult.value,
      descResult.value,
    );
    auditLog(requestId, "card.create", {
      boardId: list.boardId,
      listId,
      cardId: card.id,
      title: card.title,
    });
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
