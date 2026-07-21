// spec/013_permissions.md FR-001 / design/013_permissions.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { memberRepository } from "@/lib/repository/member";
import { checkBoardAccess, accessErrorResponse } from "@/lib/auth/permissions";
import { errorLog, newRequestId } from "@/lib/audit/log";
import { internalError } from "@/lib/errors";

type Ctx = { params: Promise<{ boardId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { boardId } = await ctx.params;
    const access = await checkBoardAccess(boardId, "viewer");
    const err = accessErrorResponse(access, "指定されたボードが見つかりません");
    if (err) return err;

    const items = await memberRepository.listByBoard(boardId);
    return NextResponse.json({ items });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
