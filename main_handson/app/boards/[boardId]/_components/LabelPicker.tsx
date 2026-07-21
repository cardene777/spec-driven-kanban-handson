"use client";

// design/005_008_ui_features_ui.md § Molecule: LabelPicker / spec/006
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import LabelChip from "./LabelChip";
import { LABEL_COLOR_CLASS, type LabelColor } from "@/lib/labelColors";

type Label = { id: string; name: string; color: string };

export default function LabelPicker({
  cardId,
  boardLabels,
  assigned,
}: {
  cardId: string;
  boardLabels: Label[];
  assigned: Label[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const assignedIds = new Set(assigned.map((l) => l.id));

  async function toggle(label: Label) {
    if (assignedIds.has(label.id)) {
      await fetch(`/api/cards/${cardId}/labels/${label.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/cards/${cardId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: label.id }),
      });
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {assigned.length === 0 ? (
          <span className="text-xs text-muted-foreground">ラベルなし</span>
        ) : (
          assigned.map((l) => <LabelChip key={l.id} label={l} onRemove={() => toggle(l)} />)
        )}
      </div>
      <Button variant="outline" size="xs" className="self-start" onClick={() => setOpen((o) => !o)}>
        {open ? "閉じる" : "ラベルを付与/解除"}
      </Button>
      {open && (
        <div className="flex flex-col gap-1 rounded-md border border-border p-2">
          {boardLabels.length === 0 ? (
            <span className="text-xs text-muted-foreground">ボードにラベルがありません</span>
          ) : (
            boardLabels.map((l) => {
              const cls =
                LABEL_COLOR_CLASS[l.color as LabelColor] ?? "bg-muted text-foreground";
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l)}
                  aria-pressed={assignedIds.has(l.id)}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                >
                  <span className={`rounded px-2 py-0.5 ${cls}`}>{l.name}</span>
                  <span className="text-muted-foreground">
                    {assignedIds.has(l.id) ? "付与済み ✓" : "付与"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
