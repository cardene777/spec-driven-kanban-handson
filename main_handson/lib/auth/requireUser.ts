// Route Handler の入口で 401 判定に統一するためのヘルパ。
// spec/000_shared_rules.md § Route Handler の入口チェック順序 の 1 (認証) を集約する。
import { UnauthorizedError } from "@/lib/http/errors";
import { getCurrentUser } from "@/lib/auth/currentUser";
import type { User } from "@prisma/client";

export async function requireCurrentUser(request: Request): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) throw new UnauthorizedError();
  return user;
}
