// spec/011_auth.md FR-003 / design/011_auth.md § API設計
// 現在のセッションのみを破棄する（同一ユーザーの他セッションは残す）。
import { NextResponse } from "next/server";
import { getSessionUser, destroySession } from "@/lib/auth/session";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { unauthorized, internalError } from "@/lib/errors";

export async function POST() {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    await destroySession();
    auditLog(requestId, "auth.logout", { userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
