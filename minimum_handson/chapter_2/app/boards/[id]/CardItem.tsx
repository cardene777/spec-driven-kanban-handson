"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Card = {
  id: string;
  title: string;
  description: string | null;
};

export default function CardItem({ card }: { card: Card }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [isSaving, setIsSaving] = useState(false);

  // フォーカスを外した（または Enter）ときに自動保存する
  async function save() {
    const trimmed = title.trim();

    // 空 or 変更なしなら保存せず元に戻して表示に戻る
    if (trimmed === "" || trimmed === card.title) {
      setTitle(card.title);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("update failed");
      setIsEditing(false);
      router.refresh();
    } catch {
      // 失敗時は元のタイトルに戻す
      setTitle(card.title);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={title}
        autoFocus
        disabled={isSaving}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur(); // blur -> save
          } else if (e.key === "Escape") {
            setTitle(card.title);
            setIsEditing(false);
          }
        }}
        className="w-full rounded-md border border-blue-500 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-900"
      />
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900">
      <p
        onClick={() => setIsEditing(true)}
        title="クリックして編集"
        className="cursor-text font-medium"
      >
        {card.title}
      </p>
      {card.description && (
        <p className="mt-1 text-xs text-gray-500">{card.description}</p>
      )}
    </div>
  );
}
