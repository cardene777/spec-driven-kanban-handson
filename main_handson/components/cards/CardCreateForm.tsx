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
    <form onSubmit={onSubmit} className="space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="カード名 (1〜200 文字)"
        className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 disabled:bg-neutral-50"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 bg-neutral-0 px-3 py-2 text-xs font-medium text-neutral-600 transition-all hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden>＋</span>
        {submitting ? "追加中..." : "カード追加"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </form>
  );
}
