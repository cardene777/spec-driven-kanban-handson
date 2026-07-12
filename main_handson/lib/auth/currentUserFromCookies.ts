// design/011_auth.md § UI 構造 > Server Component 用の Cookie 経由 currentUser
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { User } from "@prisma/client";

export async function getCurrentUserFromCookies(): Promise<User | null> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}
