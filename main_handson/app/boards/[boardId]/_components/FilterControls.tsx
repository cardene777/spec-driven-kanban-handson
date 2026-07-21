"use client";

// design/005_008_ui_features_ui.md § Molecule: FilterControls / spec/008
// <select> は shadcn 15 component に含まれないため native のまま token 由来 class で見た目を統一。
type Label = { id: string; name: string };
export type Filters = {
  labelId: string;
  due: "any" | "overdue" | "set" | "unset";
  status: "active" | "archived";
};

const SELECT_CLS =
  "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export default function FilterControls({
  boardLabels,
  filters,
  onChange,
}: {
  boardLabels: Label[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="ラベルで絞り込み"
        value={filters.labelId}
        onChange={(e) => onChange({ ...filters, labelId: e.target.value })}
        className={SELECT_CLS}
      >
        <option value="">ラベル: すべて</option>
        {boardLabels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select
        aria-label="期限で絞り込み"
        value={filters.due}
        onChange={(e) => onChange({ ...filters, due: e.target.value as Filters["due"] })}
        className={SELECT_CLS}
      >
        <option value="any">期限: すべて</option>
        <option value="overdue">期限切れ</option>
        <option value="set">期限あり</option>
        <option value="unset">期限なし</option>
      </select>
      <select
        aria-label="状態で絞り込み"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as Filters["status"] })}
        className={SELECT_CLS}
      >
        <option value="active">状態: アクティブ</option>
        <option value="archived">アーカイブ済み</option>
      </select>
    </div>
  );
}
