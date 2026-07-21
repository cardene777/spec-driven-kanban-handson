"use client";

// design/005_008_ui_features_ui.md § Molecule: ColorPicker
import { LABEL_COLORS, type LabelColor } from "@/lib/labelColors";
import ColorSwatch from "./ColorSwatch";

export default function ColorPicker({
  value,
  onChange,
}: {
  value: LabelColor;
  onChange: (color: LabelColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="ラベル色">
      {LABEL_COLORS.map((c) => (
        <ColorSwatch key={c} color={c} selected={c === value} onSelect={() => onChange(c)} />
      ))}
    </div>
  );
}
