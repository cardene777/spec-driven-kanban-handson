"use client";

// spec/001_boards.md § 操作: ボード作成
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function BoardCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/boards", {
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
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        新規ボード作成
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-start gap-2">
      <div className="flex flex-col">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ボード名を入力"
          className="w-64 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          autoFocus
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        作成
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
          setTitle("");
        }}
        className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        キャンセル
      </button>
    </form>
  );
}
