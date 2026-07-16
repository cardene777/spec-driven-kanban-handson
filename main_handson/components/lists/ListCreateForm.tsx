"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ListCreateForm({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await apiFetch(`/api/boards/${boardId}/lists`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    setSubmitting(false);
    if (res.status === 201) {
      setTitle("");
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

  return (
    <form onSubmit={onSubmit} className="flex items-start gap-2">
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="リスト名 (1〜100 文字)"
        className="max-w-md flex-1"
        disabled={submitting}
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "作成中..." : "リスト追加"}
      </Button>
      {error ? (
        <span className="self-center text-sm text-destructive">{error}</span>
      ) : null}
    </form>
  );
}
