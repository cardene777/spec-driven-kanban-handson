"use client";

// spec/002_lists.md § 操作: リスト名編集 / リスト削除
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listStatus } from "@/lib/mockMeta";

type List = { id: string; title: string };

export default function ListHeader({ list }: { list: List }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const status = listStatus(list.id);

  async function commit() {
    setError(null);
    if (title === list.title) {
      setEditing(false);
      return;
    }
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "更新に失敗しました");
      setTitle(list.title);
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!confirm(`「${list.title}」を削除します。配下のカードも削除されます。`)) return;
    const res = await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "削除に失敗しました");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: status.color }}
          aria-label={`状態: ${status.label}`}
          title={status.label}
        />
        {editing ? (
          <Input
            className="h-7 text-sm font-semibold"
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
          <h2
            className="cursor-text truncate text-sm font-semibold text-foreground"
            onClick={() => setEditing(true)}
          >
            {list.title}
          </h2>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="リストを削除"
        onClick={remove}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
