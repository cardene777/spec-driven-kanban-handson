// spec/011_auth.md § FR-01 / design/011_auth.md § POST /api/auth/signup
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { setAuditActorId } from "@/lib/log/context";
import { parseSignup } from "@/lib/schemas/auth";
import { hashPassword } from "@/lib/auth/passwordHash";
import {
  buildSessionCookie,
  createSession,
} from "@/lib/auth/session";
import { ConflictError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return withApiHandler(
    async () => {
      const { email, password, name } = parseSignup(body);
      const emailLower = email.toLowerCase();
      const existing = await prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (existing) {
        throw new ConflictError({ email: "already_registered" });
      }
      const passwordHash = hashPassword(password);
      const user = await prisma.user.create({
        data: { email: emailLower, passwordHash, name },
      });
      setAuditActorId(user.id);
      const session = await createSession(user.id);
      const res = NextResponse.json(
        { user: { id: user.id, email: user.email, name: user.name } },
        { status: 201 },
      );
      res.headers.set("Set-Cookie", buildSessionCookie(session.id));
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    { event: "auth.signup", targetType: "user" },
  );
}
