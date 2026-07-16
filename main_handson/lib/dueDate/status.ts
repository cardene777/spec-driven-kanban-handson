// design/007_due_date.md § 期限切れ判定ロジック SSOT
// dueDate と「本日」 (YYYY-MM-DD) を辞書順比較して 4 状態を返す純粋関数。

export type DueDateStatus = "none" | "future" | "today" | "overdue";

// dueDate / today はいずれも YYYY-MM-DD 形式。辞書順 = 日付順で正しく判定できる。
export function computeDueDateStatus(
  dueDate: string | null,
  today: string,
): DueDateStatus {
  if (dueDate === null) return "none";
  if (dueDate === today) return "today";
  if (dueDate > today) return "future";
  return "overdue";
}

// サーバー時刻の UTC 日付を「本日」 とする (spec/007_due_date.md § 対象データ の初期方針)。
export function getServerTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
