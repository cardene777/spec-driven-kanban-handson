// spec/006_label.md § 事前定義色 / design/005_008_ui_features_ui.md § 実装方針
export const LABEL_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export function isLabelColor(value: unknown): value is LabelColor {
  return typeof value === "string" && (LABEL_COLORS as readonly string[]).includes(value);
}

// 色コード → Tailwind クラス（チップ/スウォッチで共有）
export const LABEL_COLOR_CLASS: Record<LabelColor, string> = {
  gray: "bg-slate-200 text-slate-800",
  red: "bg-red-200 text-red-800",
  orange: "bg-orange-200 text-orange-800",
  yellow: "bg-yellow-200 text-yellow-800",
  green: "bg-green-200 text-green-800",
  blue: "bg-blue-200 text-blue-800",
  purple: "bg-purple-200 text-purple-800",
  pink: "bg-pink-200 text-pink-800",
};
