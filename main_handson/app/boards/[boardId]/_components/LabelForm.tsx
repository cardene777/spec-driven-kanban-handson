"use client";

// design/005_008_ui_features_ui.md § Molecule: LabelForm / spec/006
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ColorPicker from "./ColorPicker";
import { LABEL_COLORS, type LabelColor } from "@/lib/labelColors";

type Label = { id: string; name: string; color: string };

export default function LabelForm({
  boardId,
  label,
  onDone,
}: {
  boardId: string;
  label?: Label;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState<LabelColor>(
    (label?.color as LabelColor) ?? LABEL_COLORS[0],
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const url = label ? `/api/labels/${label.id}` : `/api/boards/${boardId}/labels`;
    const res = await fetch(url, {
      method: label ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "保存に失敗しました");
      return;
    }
    if (!label) setName("");
    onDone?.();
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Input
        type="text"
        aria-label="ラベル名"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ラベル名（1〜50文字）"
      />
      <ColorPicker value={color} onChange={setColor} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="self-start">
        {label ? "更新" : "ラベル作成"}
      </Button>
    </form>
  );
}
