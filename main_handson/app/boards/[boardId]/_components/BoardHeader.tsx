"use client";

// spec/001_boards.md § 操作: ボード名編集 / ボード削除
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Board = { id: string; title: string };

export default function BoardHeader({ board }: { board: Board }) {
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
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {editing ? (
          <Input
            className="max-w-xl text-xl font-semibold"
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
          <>
            <h1 className="font-heading text-2xl font-semibold">{board.title}</h1>
            <Button
              variant="ghost"
              size="icon"
              aria-label="ボード名を編集"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
          </>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button variant="ghost" size="icon" aria-label="ボードを削除" onClick={remove}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
