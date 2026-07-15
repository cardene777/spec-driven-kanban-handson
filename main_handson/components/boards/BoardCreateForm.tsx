"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

export default function BoardCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldError(null);
    const res = await apiFetch("/api/boards", {
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
      setFieldError(body.fields?.title ?? "invalid");
      return;
    }
    setFieldError(`error_${res.status}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ボード名 (1〜100 文字)"
          className="flex-1 rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 disabled:bg-neutral-50"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "作成中..." : "作成"}
        </button>
      </div>
      {fieldError ? (
        <p className="text-xs text-danger">{fieldError}</p>
      ) : null}
    </form>
  );
}
