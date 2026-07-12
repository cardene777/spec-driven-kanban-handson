"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

export default function CardCreateForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await apiFetch(`/api/lists/${listId}/cards`, {
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
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カード名 (1〜200 文字)"
        className="rounded border border-gray-300 px-2 py-1 text-sm"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting || !title}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {submitting ? "追加中..." : "＋ カード追加"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </form>
  );
}
