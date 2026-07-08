"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewListForm({ boardId }: { boardId: string }) {
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
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "リストの作成に失敗しました");
      }

      // 入力をクリアしてフォームを閉じ、一覧を再取得する
      setTitle("");
      setOpen(false);
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
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        リスト作成
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-72 flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/15"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="リストのタイトル"
        autoFocus
        className="rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/20 dark:bg-transparent"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || title.trim() === ""}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "作成中…" : "作成"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
            setError(null);
          }}
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
