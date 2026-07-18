// design/001_boards.md § 実装方針、design/003_cards.md § 実装方針
// title は trim(前後の半角・全角空白、タブ、改行) 後の長さで検証する

const TRIM_PATTERN = /^[\s　]+|[\s　]+$/g;

export function normalize(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(TRIM_PATTERN, "");
}

export type ValidationErr = { ok: false; reason: "required" | "too_long" | "invalid_type" };
export type ValidationOk = { ok: true; value: string };
export type ValidationResult = ValidationOk | ValidationErr;

export function validateTitle(raw: unknown, max: number): ValidationResult {
  if (raw !== undefined && typeof raw !== "string") {
    return { ok: false, reason: "invalid_type" };
  }
  const value = normalize(raw);
  if (value.length === 0) return { ok: false, reason: "required" };
  if (value.length > max) return { ok: false, reason: "too_long" };
  return { ok: true, value };
}

export function validateDescription(raw: unknown, max: number): ValidationResult {
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return { ok: false, reason: "invalid_type" };
  }
  const value = typeof raw === "string" ? raw : "";
  if (value.length > max) return { ok: false, reason: "too_long" };
  return { ok: true, value };
}
