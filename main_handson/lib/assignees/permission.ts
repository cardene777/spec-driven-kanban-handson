// spec/009_assignee.md § FR-04 (追加 / 解除導線は member 以上にのみ表示) SSOT
// design/009_assignee.md § 空状態と権限別表示 の権限判定 pure 関数
import type { Role } from "@prisma/client";

export function canManageAssignees(role: Role): boolean {
  return role === "owner" || role === "member";
}
