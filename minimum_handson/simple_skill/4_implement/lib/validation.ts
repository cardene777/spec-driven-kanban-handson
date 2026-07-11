// FR-002 (spec/005_shared_rules.md) trim 挙動と title 長さ判定
// 前後の半角スペース / 全角スペース / タブ / 改行を除去してから 1〜N 文字を検証する。

const TRIM_PATTERN = /^[\s　]+|[\s　]+$/g;

export function trimTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.replace(TRIM_PATTERN, "");
}

export function validateTitle(
  raw: unknown,
  max: 100 | 200,
): { ok: true; value: string } | { ok: false } {
  const trimmed = trimTitle(raw);
  if (trimmed === null) return { ok: false };
  if (trimmed.length < 1 || trimmed.length > max) return { ok: false };
  return { ok: true, value: trimmed };
}
