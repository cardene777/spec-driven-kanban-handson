"use client";

// design/005_008_ui_features_ui.md § Molecule: SearchBar / spec/008
import { Input } from "@/components/ui/input";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="search"
      aria-label="カード検索キーワード"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="タイトル・説明文を検索"
      maxLength={100}
      className="w-64"
    />
  );
}
