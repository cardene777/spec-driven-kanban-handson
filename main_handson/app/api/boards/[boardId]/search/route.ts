// spec/008_search_filter.md § API（カード検索・絞り込み）
import { NextRequest, NextResponse } from "next/server";
import { boardRepository } from "@/lib/repository/board";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { searchRepository, type DueFilter, type StatusFilter } from "@/lib/repository/search";
import { errorLog, newRequestId } from "@/lib/audit/log";
import { notFound, validationError, internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };

const DUE_VALUES: DueFilter[] = ["any", "overdue", "set", "unset"];
const STATUS_VALUES: StatusFilter[] = ["active", "archived"];

export async function GET(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "viewer");
    const accessErr = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (accessErr) return accessErr;

    const board = await boardRepository.findById(boardId);
    if (!board) return notFound("指定されたボードが見つかりません");

    const sp = new URL(req.url).searchParams;
    const keyword = sp.get("keyword") ?? "";
    if (keyword.length > 100) {
      return validationError("keywordは100文字以内で入力してください", { keyword: "too_long" });
    }
    const labelId = sp.get("labelId");
    const due = (sp.get("due") ?? "any") as DueFilter;
    if (!DUE_VALUES.includes(due)) {
      return validationError("dueは any/overdue/set/unset のいずれかです", { due: "invalid" });
    }
    const status = (sp.get("status") ?? "active") as StatusFilter;
    if (!STATUS_VALUES.includes(status)) {
      return validationError("statusは active/archived のいずれかです", { status: "invalid" });
    }

    const items = await searchRepository.searchBoard(boardId, {
      keyword,
      labelId: labelId && labelId.length > 0 ? labelId : null,
      due,
      status,
    });
    return NextResponse.json({ items });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
