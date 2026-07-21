// design/001_boards.md / 003_cards.md § 実装方針
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

export type OrderResult =
  | { ok: true; value: number }
  | { ok: false; reason: "invalid_type" };

export function validateOrder(raw: unknown): OrderResult {
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { ok: false, reason: "invalid_type" };
  }
  return { ok: true, value: raw };
}

// design/007_due_date.md § 実装方針
// dueDate は YYYY-MM-DD 文字列（実在日付）か null。UTC 00:00 に正規化。
export type DueDateResult =
  | { ok: true; value: Date | null }
  | { ok: false };

export function validateDueDate(raw: unknown): DueDateResult {
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return { ok: false };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false };
  }
  return { ok: true, value: date };
}
