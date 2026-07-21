// spec/011_auth.md FR-004 / design/011_auth.md § API設計
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { errorLog, newRequestId } from "@/lib/audit/log";
import { unauthorized, internalError } from "@/lib/errors";

export async function GET() {
  const requestId = newRequestId();
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    return NextResponse.json({ user });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
