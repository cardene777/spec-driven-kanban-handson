// spec/009_assignee.md FR-004 / design/009_assignee.md § 純粋関数の契約
// 担当者入力のバリデーション: userId が「空でない文字列」であることを検証する純粋関数。
// trim 後の長さで判定し、空白のみは不正扱いとする（lib/validation/text.ts の trim 方針と整合）。

export function isValidAssigneeUserId(userId: unknown): boolean {
  return typeof userId === "string" && userId.trim().length > 0;
}
