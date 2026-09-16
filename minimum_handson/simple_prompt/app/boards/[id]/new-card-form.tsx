"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCardForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch(`/api/lists/${listId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? "作成に失敗しました");
      return;
    }
    setError(null);
    setTitle("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-600 transition hover:bg-gray-200"
      >
        ＋ カード追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カードのタイトル"
        className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
