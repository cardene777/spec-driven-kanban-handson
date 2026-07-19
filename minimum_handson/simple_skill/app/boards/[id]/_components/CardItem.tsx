"use client";

// FR-401 タイトルクリックでインライン編集、FR-402 フォーカスアウトで自動保存
import { useState } from "react";

type Card = { id: string; title: string; order: number };

export function CardItem({
  card,
  onSaved,
}: {
  card: Card;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.title);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setValue(card.title);
    setError(null);
    setEditing(true);
  }

  // FR-402 blur で自動保存。変更が無ければ何もしない
  async function save() {
    setEditing(false);
    if (value === card.title) return;

    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });

    if (!res.ok) {
      // 空文字や上限超過は更新されない。表示を元に戻してエラーを示す
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "更新に失敗しました");
      setValue(card.title);
      return;
    }
    setError(null);
    onSaved();
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(card.title);
            setError(null);
            setEditing(false);
          }
        }}
        className="w-full rounded-md border border-blue-400 bg-white px-3 py-2 text-sm"
      />
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={startEdit}
        className="w-full text-left text-sm break-words"
      >
        {card.title}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
