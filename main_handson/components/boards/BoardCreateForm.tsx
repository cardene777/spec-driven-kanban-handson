"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form onSubmit={onSubmit} className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ボード名 (1〜100 文字)"
          disabled={submitting}
        />
        {fieldError ? (
          <span className="mt-1 block text-sm text-destructive">
            {fieldError}
          </span>
        ) : null}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "作成中..." : "作成"}
      </Button>
    </form>
  );
}
