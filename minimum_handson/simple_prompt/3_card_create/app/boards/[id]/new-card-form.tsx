"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCardForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === "" || submitting) return;

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
        throw new Error(data?.error ?? "カードの作成に失敗しました");
      }

      // 入力をクリアし、続けて追加できるようフォームは開いたまま一覧を再取得する
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-black/20 px-3 py-2 text-left text-sm text-black/60 transition hover:bg-black/5 dark:border-white/25 dark:text-white/60 dark:hover:bg-white/10"
      >
        + カード追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カードのタイトル"
        autoFocus
        className="rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20 dark:bg-transparent"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || title.trim() === ""}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "追加中…" : "追加"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setError(null);
          }}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          閉じる
        </button>
      </div>
    </form>
  );
}
