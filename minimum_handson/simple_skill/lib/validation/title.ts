// 共有トリム検証（design/001_minimum_kanban.md バリデーション）
// Board・List は上限 100、Card は上限 200 と、上限だけを差し替えて使う
import { ValidationError } from "@/lib/errors";

// 前後の半角・全角空白、タブ、改行を除去する
// \s は全角空白(U+3000)を含まないため明示的に加える
const TRIM_PATTERN = /^[\s　]+|[\s　]+$/g;

export function trimTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(TRIM_PATTERN, "");
}

// トリム後に 1〜maxLength 文字であることを検証し、トリム後の値を返す
// 失敗時は ValidationError(400) を投げる
export function validateTitle(raw: unknown, maxLength: number): string {
  const trimmed = trimTitle(raw);
  if (trimmed.length < 1 || trimmed.length > maxLength) {
    throw new ValidationError(`タイトルは1〜${maxLength}文字で入力してください`);
  }
  return trimmed;
}
