"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@prisma/client";
import { apiFetch } from "@/lib/client/apiFetch";

export default function BoardHeader({
  board,
  canEdit,
}: {
  board: Board;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(board.title);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const res = await apiFetch(`/api/boards/${board.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    if (res.status === 200) {
      setEditing(false);
      setError(null);
      router.refresh();
      return;
    }
    if (res.status === 422) {
      const body = (await res.json()) as {
        fields?: Record<string, string>;
      };
      setError(body.fields?.title ?? "invalid");
      return;
    }
    setError(`error_${res.status}`);
  }

  async function remove() {
    if (!window.confirm("このボードを削除します。 配下のリスト・カードも全て消えます。 よろしいですか?")) {
      return;
    }
    const res = await apiFetch(`/api/boards/${board.id}`, {
      method: "DELETE",
    });
    if (res.status === 204) {
      router.push("/");
      router.refresh();
      return;
    }
    setError(`error_${res.status}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2.5 text-xl font-semibold text-neutral-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              autoFocus
            />
            <button
              onClick={save}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              保存
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setTitle(board.title);
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-neutral-0 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              取消
            </button>
          </div>
        ) : (
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            {board.title}
          </h1>
        )}

        {canEdit && !editing ? (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-0 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              名称編集
            </button>
            <button
              onClick={remove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger-border bg-neutral-0 px-3 py-1.5 text-sm font-medium text-danger shadow-sm transition-colors hover:bg-danger-soft"
            >
              削除
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}
    </div>
  );
}
