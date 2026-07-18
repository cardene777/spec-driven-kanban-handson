// spec/000_shared_rules.md § 認証の前提
// 本章 02 セクションでは、開発用の固定ユーザーを1件用意して返す
import { prisma } from "@/lib/prisma";

const DEV_USER_EMAIL = "dev@example.com";

export type CurrentUser = { id: string; email: string };

export async function currentUser(): Promise<CurrentUser | null> {
  const existing = await prisma.user.findUnique({
    where: { email: DEV_USER_EMAIL },
    select: { id: true, email: true },
  });
  if (existing) return existing;
  const created = await prisma.user.create({
    data: { email: DEV_USER_EMAIL },
    select: { id: true, email: true },
  });
  return created;
}
