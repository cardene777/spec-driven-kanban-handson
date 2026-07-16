// design/007_due_date.md § セキュリティ = YYYY-MM-DD 形式検証 + 実在日付検証 SSOT
// 期限更新 (schemas/dueDate.ts) と検索の期間指定 (schemas/cardSearch.ts) で共有する。

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 半角ゼロパディングの YYYY-MM-DD 形式か。
export function isDateFormat(value: string): boolean {
  return DATE_RE.test(value);
}

// 実在する日付か。2026-02-30 のような形式は合うが存在しない日付を排除する。
// new Date で再構築し、toISOString の日付部分が入力と一致するかで判定する。
export function isRealDate(value: string): boolean {
  if (!isDateFormat(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === value;
}
