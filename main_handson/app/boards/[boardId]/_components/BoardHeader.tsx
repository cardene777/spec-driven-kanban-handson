"use client";

// spec/001_boards.md § 操作: ボード名編集 / ボード削除
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Board = { id: string; title: string };

export default function BoardHeader({
  board,
  canWrite,
}: {
  board: Board;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(board.title);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function commit() {
    setError(null);
    if (title === board.title) {
      setEditing(false);
      return;
    }
    const res = await fetch(`/api/boards/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "更新に失敗しました");
      setTitle(board.title);
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!confirm(`「${board.title}」を削除します。よろしいですか？`)) return;
    const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "削除に失敗しました");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            className="w-full max-w-xl rounded border border-slate-300 px-3 py-2 text-xl font-semibold focus:border-slate-500 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            autoFocus
          />
        ) : (
          <h1
            className="text-2xl font-semibold cursor-text"
            onClick={() => canWrite && setEditing(true)}
          >
            {board.title}
          </h1>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      {canWrite && (
        <button
          type="button"
          onClick={remove}
          className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          ボード削除
        </button>
      )}
    </div>
  );
}
