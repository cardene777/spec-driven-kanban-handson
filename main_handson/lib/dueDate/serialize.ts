// design/007_due_date.md § JSON 表現 / § 実装方針
// 内部の DateTime (時刻 00:00:00 UTC 固定) を API 表現の YYYY-MM-DD 文字列に変換する。

// DateTime (Date | ISO 文字列) → YYYY-MM-DD 文字列。null はそのまま返す。
export function toDateOnly(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const iso = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  return iso.slice(0, 10);
}

// YYYY-MM-DD 文字列 → 時刻 00:00:00.000 UTC の Date (DB 保存用)。null はそのまま。
export function fromDateOnly(value: string | null): Date | null {
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

// YYYY-MM-DD に UTC で N 日加算した YYYY-MM-DD を返す (期限絞り込みの範囲計算用)。
export function addDaysUtc(dateStr: string, days: number): string {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

// prisma Card の dueDate を YYYY-MM-DD にシリアライズした形へ変換する。
// 他フィールドはそのまま透過する。
export function serializeCard<T extends { dueDate: Date | string | null }>(
  card: T,
): Omit<T, "dueDate"> & { dueDate: string | null } {
  return { ...card, dueDate: toDateOnly(card.dueDate) };
}
