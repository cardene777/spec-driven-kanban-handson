// spec/011_auth.md § FR-03 / design/011_auth.md § POST /api/auth/logout
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/http/withApiHandler";
import {
  SESSION_COOKIE_NAME,
  buildLogoutCookie,
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
      const cookieHeader = request.headers.get("cookie") ?? "";
      const sid = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
      if (sid) {
        await prisma.session.deleteMany({ where: { id: sid } });
      }
      const res = new NextResponse(null, { status: 204 });
      res.headers.set("Set-Cookie", buildLogoutCookie());
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    { event: "auth.logout", targetType: "user" },
  );
}
