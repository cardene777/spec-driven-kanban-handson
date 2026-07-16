"use client";

import { Badge } from "@/components/ui/badge";
import { computeDueDateStatus, getServerTodayUtc } from "@/lib/dueDate/status";

// design/007_due_date.md § UI 構造 > CardDueDateBadge
// 期限バッジ。状態 (future / today / overdue) で表現を変え、none は非表示。
// 色は shadcn semantic token / brand token のみ (生 hex / 生 Tailwind 色クラス禁止)。
// 色だけに依存しないよう状態文言も併記する (a11y)。
export default function CardDueDateBadge({
  dueDate,
}: {
  dueDate: string | null;
}) {
  const status = computeDueDateStatus(dueDate, getServerTodayUtc());
  if (status === "none" || dueDate === null) return null;

  if (status === "overdue") {
    return (
      <Badge variant="destructive" aria-label={`期限切れ: ${dueDate}`}>
        期限切れ {dueDate}
      </Badge>
    );
  }

  if (status === "today") {
    return (
      <Badge
        aria-label={`今日が期限: ${dueDate}`}
        style={{
          backgroundColor: "var(--warning)",
          color: "var(--brand-neutral-0)",
        }}
      >
        今日 {dueDate}
      </Badge>
    );
  }

  // future = 通常表現
  return (
    <Badge variant="secondary" aria-label={`期限: ${dueDate}`}>
      {dueDate}
    </Badge>
  );
}
