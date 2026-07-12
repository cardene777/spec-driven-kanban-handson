// design/010_comment.md § データモデル > HTML エスケープ (pure 関数) SSOT
// spec/010_comment.md § 非機能要件 > セキュリティ の 5 対象文字置換

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}
