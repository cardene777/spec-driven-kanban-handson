"use client";

// FR-001 / FR-002 (spec/04_card_edit.md)
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CardItem({ card }: { card: { id: string; title: string } }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.title);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function commit() {
    setError(null);
    const trimmed = value;
    if (trimmed === card.title) {
      setEditing(false);
      return;
    }
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "更新に失敗しました");
      setValue(card.title);
      return;
    }
    setEditing(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-2 text-sm shadow-sm">
      {editing ? (
        <textarea
          className="w-full resize-none rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          autoFocus
          rows={2}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full text-left"
        >
          {card.title}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
