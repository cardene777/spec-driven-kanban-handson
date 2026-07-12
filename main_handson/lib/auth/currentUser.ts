// design/011_auth.md § getCurrentUser(request) の実装差し替え
// X-User-Id header 経路は廃止し Cookie ベースの Session に置き換える。
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { User } from "@prisma/client";

export async function getCurrentUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sid = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name && v) return decodeURIComponent(v);
  }
  return null;
}
