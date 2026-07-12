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
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="ボード名 (1〜100 文字)"
        className="flex-1 rounded border border-gray-300 px-3 py-2"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "作成中..." : "作成"}
      </button>
      {fieldError ? (
        <span className="ml-2 self-center text-sm text-red-600">
          {fieldError}
        </span>
      ) : null}
    </form>
  );
}
