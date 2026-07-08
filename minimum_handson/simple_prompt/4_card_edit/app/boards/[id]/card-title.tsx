"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CardTitle({
  cardId,
  initialTitle,
}: {
  cardId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = title.trim();
    // 空、または変更なしなら保存せず表示に戻す
    if (trimmed === "" || trimmed === initialTitle) {
      setTitle(initialTitle);
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("update failed");
      setEditing(false);
      router.refresh();
    } catch {
      // 失敗したら編集前のタイトルに戻す
      setTitle(initialTitle);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full cursor-text text-left font-medium"
      >
        {initialTitle}
      </button>
    );
  }

  return (
    <input
      type="text"
      value={title}
      autoFocus
      disabled={saving}
      onChange={(e) => setTitle(e.target.value)}
      // フォーカスを外したら自動で保存する
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setTitle(initialTitle);
          setEditing(false);
        }
      }}
      className="w-full rounded border border-blue-500 px-2 py-1 font-medium outline-none dark:bg-transparent"
    />
  );
}
