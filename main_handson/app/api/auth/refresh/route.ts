// spec/011_auth.md § FR-05 / design/011_auth.md § POST /api/auth/refresh
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookie,
  createSession,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name && v) return decodeURIComponent(v);
  }
  return null;
}

export async function POST(request: Request) {
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const cookieHeader = request.headers.get("cookie") ?? "";
      const oldSid = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
      const session = await prisma.$transaction(async (tx) => {
        if (oldSid) {
          await tx.session.deleteMany({ where: { id: oldSid } });
        }
        return createSession(user.id, tx);
      });
      const res = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
      });
      res.headers.set("Set-Cookie", buildSessionCookie(session.id));
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    { event: "auth.refresh", targetType: "user" },
  );
}
