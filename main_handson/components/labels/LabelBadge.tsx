import { Badge } from "@/components/ui/badge";
import type { LabelColor } from "@/lib/labels/colors";

// design/006_label.md § UI 構造 > CardLabelBadge
// ラベルの色付きバッジ。色は label.color (データ) から var(--label-{color}-*) を参照して当てる。
// 生 hex / 生 Tailwind 色クラスは使わない (tokens.css の CSS 変数に集約)。
export default function LabelBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: LabelColor;
  className?: string;
}) {
  return (
    <Badge
      className={className}
      style={{
        backgroundColor: `var(--label-${color}-bg)`,
        color: `var(--label-${color}-fg)`,
      }}
      aria-label={`ラベル: ${name}`}
    >
      {name}
    </Badge>
  );
}
