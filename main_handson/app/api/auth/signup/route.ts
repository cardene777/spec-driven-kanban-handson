// spec/011_auth.md FR-001 / design/011_auth.md § API設計
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isValidEmail, isValidPassword, isValidName, normalizeName } from "@/lib/validation/auth";
import { auditLog, errorLog, newRequestId } from "@/lib/audit/log";
import { conflict, validationError, internalError } from "@/lib/errors";

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
        "パスワードは8〜72文字で、英字と数字をそれぞれ1文字以上含めてください",
        { password: "invalid" },
      );
    }
    if (!isValidName(body.name)) {
      return validationError("名前は1〜50文字で入力してください", { name: "invalid" });
    }

    const email = body.email as string;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return conflict("このメールアドレスは既に登録されています", { email: "duplicate" });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(body.password as string),
        name: normalizeName(body.name),
      },
      select: { id: true, email: true, name: true },
    });

    await createSession(user.id);
    auditLog(requestId, "auth.signup", { userId: user.id });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    errorLog(requestId, e, 500);
    return internalError();
  }
}
