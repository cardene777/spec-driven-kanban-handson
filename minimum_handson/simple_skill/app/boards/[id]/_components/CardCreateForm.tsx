"use client";

// FR-004 (spec/03_card.md)
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CardCreateForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
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
        className="w-full rounded border border-dashed border-slate-400 py-2 text-sm text-slate-600 hover:border-slate-600 hover:text-slate-900"
      >
        + カード追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カード名を入力"
        rows={2}
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        autoFocus
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setTitle("");
          }}
          className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
