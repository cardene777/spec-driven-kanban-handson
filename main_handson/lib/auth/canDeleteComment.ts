// design/010_comment.md § データモデル > 削除権限判定 (pure 関数) SSOT
// spec/010_comment.md § 権限境界 の 2 段目 (投稿者本人 or owner) 判定
import type { Role } from "@prisma/client";

export function canDeleteComment(input: {
  actorId: string;
  authorId: string;
  actorRole: Role;
}): boolean {
  const { actorId, authorId, actorRole } = input;
  if (actorRole === "owner") return true;
  if (actorRole === "member" && actorId === authorId) return true;
  return false;
}
