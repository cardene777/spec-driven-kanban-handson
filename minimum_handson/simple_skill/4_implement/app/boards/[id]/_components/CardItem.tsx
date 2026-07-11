// spec/004_card_edit.md FR-001 / FR-002
"use client";

import { useEffect, useRef, useState } from "react";

type Card = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  listId: string;
  createdAt: string;
};

export function CardItem({
  card,
  onUpdated,
}: {
  card: Card;
  onUpdated: (card: Card) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function beginEdit() {
    if (isEditing) return;
    setDraft(card.title);
    setError(null);
    setIsEditing(true);
  }

  async function commit() {
    const trimmed = draft.replace(/^[\s　]+|[\s　]+$/g, "");
    setIsEditing(false);
    if (trimmed === card.title) {
      setDraft(card.title);
      return;
    }
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "更新に失敗しました");
        setDraft(card.title);
        return;
      }
      setError(null);
      onUpdated(data.card);
    } catch {
      setError("通信エラーが発生しました");
      setDraft(card.title);
    }
  }

  return (
    <div className="rounded bg-white p-3 shadow-sm">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              setDraft(card.title);
              setIsEditing(false);
              setError(null);
            }
          }}
          className="w-full rounded border px-2 py-1 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          className="w-full text-left text-sm"
        >
          {card.title}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
