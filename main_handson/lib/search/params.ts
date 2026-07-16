// design/008_search_filter.md § クエリパラメータの解析 = transform helpers SSOT

// "true" のみを真として扱う (spec/008_search_filter.md § バリデーション の初期方針)。
export function parseBooleanQuery(value: string | undefined | null): boolean {
  return value === "true";
}

// カンマ区切り文字列 → 文字列配列。trim + 空要素除去 + 重複除去。
// "" / undefined は [] を返す。
export function splitCsv(value: string | undefined | null): string[] {
  if (!value) return [];
  const out: string[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (trimmed.length > 0 && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

// 検索キーワード分割。半角空白 / タブ / 改行 / 全角空白 (U+3000) を区切りとし空要素を除去する。
export function splitKeywords(q: string): string[] {
  return q
    .trim()
    .split(/[\s　]+/)
    .filter((w) => w.length > 0);
}
