// spec/011_auth.md FR-001 / design/011_auth.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionRecord,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { isValidEmail, isValidPassword, isValidName, normalizeName } from "@/lib/validation/auth";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { conflict, validationError, internalError } from "@/lib/errors";

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

class DuplicateEmailError extends Error {}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
    };

    if (!isValidEmail(body.email)) {
      return validationError("メールアドレスの形式が正しくありません", { email: "invalid" });
    }
    if (!isValidPassword(body.password)) {
      return validationError(
        "パスワードは8〜200文字で、英字、数字、記号をそれぞれ1文字以上含めてください",
        { password: "invalid" },
      );
    }
    if (!isValidName(body.name)) {
      return validationError("名前は1〜50文字で入力してください", { name: "invalid" });
    }

    const email = body.email as string;
    let result: {
      user: { id: string; email: string; name: string };
      sessionToken: string;
    };
    try {
      result = await prisma.$transaction(async (tx) => {
        let user: { id: string; email: string; name: string };
        try {
          user = await tx.user.create({
            data: {
              email,
              passwordHash: hashPassword(body.password as string),
              name: normalizeName(body.name),
            },
            select: { id: true, email: true, name: true },
          });
        } catch (e) {
          if (isUniqueConstraintError(e)) throw new DuplicateEmailError();
          throw e;
        }

        const sessionToken = await createSessionRecord(user.id, tx);
        return { user, sessionToken };
      });
    } catch (e) {
      if (e instanceof DuplicateEmailError) {
        return conflict("このメールアドレスは既に登録されています", { email: "duplicate" });
      }
      throw e;
    }

    auditLog(requestId, "auth.signup", { userId: result.user.id });
    const response = NextResponse.json({ user: result.user }, { status: 201 });
    response.cookies.set(
      SESSION_COOKIE,
      result.sessionToken,
      sessionCookieOptions(SESSION_TTL_MS / 1000),
    );
    return response;
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
