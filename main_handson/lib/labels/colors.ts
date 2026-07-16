// spec/006_label.md § 事前定義された色パレット SSOT (8 色の列挙値)
// Prisma enum LabelColor と識別子文字列を一致させる。UI / server 双方から参照する。

export const LABEL_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export function isLabelColor(value: unknown): value is LabelColor {
  return (
    typeof value === "string" &&
    (LABEL_COLORS as readonly string[]).includes(value)
  );
}

// API レスポンスの Label 表現 (UI / client 側で共有する形)。
export type Label = {
  id: string;
  boardId: string;
  name: string;
  color: LabelColor;
  createdAt: string;
  updatedAt: string;
};
