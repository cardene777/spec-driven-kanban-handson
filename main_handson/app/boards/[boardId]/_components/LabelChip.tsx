// design/005_008_ui_features_ui.md § Atom: LabelChip
import { LABEL_COLOR_CLASS, type LabelColor } from "@/lib/labelColors";

type Label = { id: string; name: string; color: string };

export default function LabelChip({
  label,
  onRemove,
}: {
  label: Label;
  onRemove?: () => void;
}) {
  const cls = LABEL_COLOR_CLASS[label.color as LabelColor] ?? "bg-muted text-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`ラベル ${label.name} を解除`}
          className="ml-0.5 text-current/70 hover:text-current"
        >
          ×
        </button>
      )}
    </span>
  );
}
