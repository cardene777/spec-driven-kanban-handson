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
    <div className="flex items-baseline justify-between border-b border-gray-200 pb-3">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-xl"
            autoFocus
          />
          <button
            onClick={save}
            className="rounded bg-black px-3 py-1.5 text-white"
          >
            保存
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setTitle(board.title);
              setError(null);
            }}
            className="rounded border border-gray-300 px-3 py-1.5"
          >
            取消
          </button>
        </div>
      ) : (
        <h1 className="text-2xl font-semibold">{board.title}</h1>
      )}

      {canEdit && !editing ? (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            名称編集
          </button>
          <button
            onClick={remove}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600"
          >
            削除
          </button>
        </div>
      ) : null}

      {error ? (
        <span className="ml-2 text-sm text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
