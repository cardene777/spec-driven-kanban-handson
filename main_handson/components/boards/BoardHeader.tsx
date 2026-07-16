"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@prisma/client";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 flex-1 text-xl"
            autoFocus
          />
          <Button onClick={save}>保存</Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(false);
              setTitle(board.title);
              setError(null);
            }}
          >
            取消
          </Button>
        </div>
      ) : (
        <h1 className="font-heading text-2xl font-semibold">{board.title}</h1>
      )}

      {canEdit && !editing ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            名称編集
          </Button>
          <Button variant="destructive" size="sm" onClick={remove}>
            削除
          </Button>
        </div>
      ) : null}

      {error ? (
        <span className="text-sm text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
