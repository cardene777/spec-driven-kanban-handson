"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewBoardForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/boards", {
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
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        新規ボード作成
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ボードのタイトル"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        作成
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-gray-300 px-4 py-2"
      >
        キャンセル
      </button>
    </form>
  );
}
