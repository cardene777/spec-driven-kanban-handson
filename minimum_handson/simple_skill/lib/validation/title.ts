// FR-001 / FR-003 (Board), FR-003 (List), FR-003 (Card), FR-003 (Card edit)
// spec/00_common.md: trim(前後の半角・全角空白、タブ、改行) してから長さ検証、trim 後の値を保存

const TRIM_PATTERN = /^[\s　]+|[\s　]+$/g;

export type TitleValidationOk = { ok: true; value: string };
export type TitleValidationErr = { ok: false; message: string };
export type TitleValidationResult = TitleValidationOk | TitleValidationErr;

export function normalizeTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(TRIM_PATTERN, "");
}

export function validateTitle(raw: unknown, max: number): TitleValidationResult {
  const value = normalizeTitle(raw);
  if (value.length < 1 || value.length > max) {
    return { ok: false, message: `titleは1〜${max}文字で入力してください` };
  }
  return { ok: true, value };
}
