"use client";

// design/005_008_ui_features_ui.md § Molecule: DueDateField / spec/007
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DueDateBadge, { formatDueDate } from "./DueDateBadge";

export default function DueDateField({
  cardId,
  dueDate,
}: {
  cardId: string;
  dueDate: string | Date | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(dueDate ? formatDueDate(dueDate) : "");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function save(next: string | null) {
    setError(null);
    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "期限の更新に失敗しました");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {dueDate ? (
          <DueDateBadge dueDate={dueDate} />
        ) : (
          <span className="text-xs text-muted-foreground">期限なし</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="期限"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40"
        />
        <Button size="sm" onClick={() => save(value || null)}>
          期限を保存
        </Button>
        {dueDate && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setValue("");
              save(null);
            }}
          >
            解除
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
