// spec/011_auth.md § FR-02 / design/011_auth.md § POST /api/auth/login
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { parseLogin } from "@/lib/schemas/auth";
import { verifyPassword } from "@/lib/auth/passwordHash";
import { buildSessionCookie, createSession } from "@/lib/auth/session";
import { InvalidCredentialsError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const { email, password } = parseLogin(body);
      const emailLower = email.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: emailLower },
      });
      const ok = user && verifyPassword(password, user.passwordHash);
      if (!user || !ok) {
        throw new InvalidCredentialsError();
      }
      const session = await createSession(user.id);
      const res = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
      });
      res.headers.set("Set-Cookie", buildSessionCookie(session.id));
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    { event: "auth.login", targetType: "user" },
  );
}
