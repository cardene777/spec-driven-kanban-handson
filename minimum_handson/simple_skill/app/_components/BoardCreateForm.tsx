"use client";

// FR-102 「新規ボード作成」ボタンでフォーム表示、FR-103 送信でボード作成
import { useState } from "react";

export function BoardCreateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "作成に失敗しました");
        return;
      }
      setTitle("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        新規ボード作成
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ボード名"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
