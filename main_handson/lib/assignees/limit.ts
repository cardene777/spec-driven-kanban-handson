// spec/009_assignee.md § 境界条件 (10 名上限) SSOT
// design/009_assignee.md § POST /api/cards/{cardId}/assignees の上限判定 pure 関数
import { ValidationError } from "@/lib/http/errors";

export const ASSIGNEES_MAX = 10;

export function assertBelowLimit(count: number): void {
  if (count >= ASSIGNEES_MAX) {
    throw new ValidationError({ userId: "assignees_limit_exceeded" });
  }
}
