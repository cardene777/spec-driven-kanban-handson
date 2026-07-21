"use client";

// spec/002_lists.md § 操作: リスト作成
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ListCreateForm({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/boards/${boardId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "作成に失敗しました");
      return;
    }
    setTitle("");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>リスト作成</Button>;
  }

  return (
    <form onSubmit={submit} className="flex items-start gap-2">
      <div className="flex flex-col">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="リスト名"
          className="w-56"
          autoFocus
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={pending}>
        作成
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(false);
          setError(null);
          setTitle("");
        }}
      >
        キャンセル
      </Button>
    </form>
  );
}
