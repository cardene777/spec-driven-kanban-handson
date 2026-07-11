// spec/001_boards.md FR-002 / FR-003 / FR-004
"use client";

import Link from "next/link";
import { useState } from "react";

type Board = { id: string; title: string; createdAt: string };

export function BoardListView({ initialBoards }: { initialBoards: Board[] }) {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "作成に失敗しました");
        return;
      }
      setBoards((prev) => [data.board, ...prev]);
      setTitle("");
      setIsFormOpen(false);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        {!isFormOpen ? (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            新規ボード作成
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded border bg-white p-4"
          >
            <label className="text-sm font-medium">ボード名</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="rounded border px-3 py-2"
              placeholder="例: 買い物リスト"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                作成
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setTitle("");
                  setError(null);
                }}
                className="rounded border px-4 py-2 hover:bg-zinc-100"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>

      {boards.length === 0 ? (
        <p className="text-zinc-500">まだボードがありません</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/boards/${b.id}`}
                className="block rounded border bg-white p-4 shadow-sm hover:bg-zinc-50"
              >
                <p className="truncate text-lg font-medium">{b.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
