"use client";

// spec/003_cards.md § 操作: カード作成
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CardCreateForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/lists/${listId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "作成に失敗しました");
      return;
    }
    setTitle("");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
      >
        + カード追加
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カード名"
        rows={2}
        className="bg-card"
        autoFocus
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          追加
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
            setTitle("");
          }}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
