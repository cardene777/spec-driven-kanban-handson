// design/005_008_ui_features_ui.md § Atom: ColorSwatch
import { LABEL_COLOR_CLASS, type LabelColor } from "@/lib/labelColors";

export default function ColorSwatch({
  color,
  selected,
  onSelect,
}: {
  color: LabelColor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`色 ${color}`}
      aria-pressed={selected}
      className={`size-6 rounded-md ${LABEL_COLOR_CLASS[color]} ${
        selected ? "ring-2 ring-foreground ring-offset-1" : ""
      }`}
    />
  );
}
