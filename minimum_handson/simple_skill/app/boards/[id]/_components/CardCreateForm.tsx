"use client";

// FR-302 「カード追加」ボタンでフォーム表示、FR-303 送信でカード作成
import { useState } from "react";

export function CardCreateForm({
  listId,
  onCreated,
}: {
  listId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}/cards`, {
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
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
      >
        + カード追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カードのタイトル"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
