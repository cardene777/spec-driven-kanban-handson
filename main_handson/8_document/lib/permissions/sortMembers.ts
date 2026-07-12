// design/013_permissions.md § UI 構造 / § API 設計 > メンバー一覧のロール順ソート
import type { Role } from "@prisma/client";

export type SortableMember = {
  userId: string;
  role: Role;
  createdAt: Date;
};

const ROLE_RANK: Record<Role, number> = {
  owner: 0,
  member: 1,
  viewer: 2,
};

export function sortMembers<T extends SortableMember>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    if (ROLE_RANK[a.role] !== ROLE_RANK[b.role]) {
      return ROLE_RANK[a.role] - ROLE_RANK[b.role];
    }
    const at = a.createdAt.getTime();
    const bt = b.createdAt.getTime();
    if (at !== bt) return at - bt;
    return a.userId.localeCompare(b.userId);
  });
}
