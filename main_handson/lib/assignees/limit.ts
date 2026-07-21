// spec/009_assignee.md FR-005 / design/009_assignee.md § 純粋関数の契約
// 担当者数の上限判定。上限は 1 箇所に定数化し、API 層・UI 抑止で共有する。

export const MAX_ASSIGNEES = 10;

// 現在の担当者数から、担当者の追加を許可できるかを判定する純粋関数。
// 0 以上の整数かつ上限未満なら許可（例: 0→true, 9→true）。上限以上・負数・非整数は拒否。
export function canAddAssignee(currentCount: number): boolean {
  if (!Number.isInteger(currentCount) || currentCount < 0) return false;
  return currentCount < MAX_ASSIGNEES;
}
