// design/005_008_ui_features_ui.md § Atom: DueDateBadge / spec/007 期限切れ表示
export function isOverdue(dueDate: string | Date): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
}

export function formatDueDate(dueDate: string | Date): string {
  return String(new Date(dueDate).toISOString()).slice(0, 10);
}

export default function DueDateBadge({ dueDate }: { dueDate: string | Date }) {
  const overdue = isOverdue(dueDate);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
        overdue
          ? "bg-[var(--brand-danger)]/12 text-[var(--brand-danger)]"
          : "bg-muted text-muted-foreground"
      }`}
      aria-label={overdue ? "期限切れ" : "期限"}
    >
      📅 {formatDueDate(dueDate)}
      {overdue && <span className="font-semibold">期限切れ</span>}
    </span>
  );
}
