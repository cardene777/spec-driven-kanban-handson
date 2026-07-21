// spec/011_auth.md FR-002 / design/011_auth.md § API設計
// 認証失敗はメール不存在・パスワード不一致を区別せず同一の 401 を返す。
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { unauthorized, validationError, internalError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return validationError("メールアドレスとパスワードを入力してください", {
        _root: "invalid",
      });
    }

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      // 失敗理由は応答に出さず、ログにのみ残す
      auditLog(requestId, "auth.login_failed", { email: body.email, reason: "no_user" });
      return unauthorized();
    }
    if (!verifyPassword(body.password, user.passwordHash)) {
      auditLog(requestId, "auth.login_failed", { email: body.email, reason: "bad_password" });
      return unauthorized();
    }

    await createSession(user.id);
    auditLog(requestId, "auth.login", { userId: user.id });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
