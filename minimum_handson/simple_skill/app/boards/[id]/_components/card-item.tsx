"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CardView = { id: string; title: string };

// spec/04_card_edit.md FR-001 / FR-002
export function CardItem({ card }: { card: CardView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);

  // フォーカスアウト（blur）時に自動保存する
  async function handleBlur() {
    setEditing(false);
    const trimmed = title.trim();

    // 空文字は保存せず、直前の値へ戻す（E-001）
    if (trimmed === "") {
      setTitle(card.title);
      return;
    }

    // 値が未変更なら API を呼ばない
    if (trimmed === card.title) {
      setTitle(card.title);
      return;
    }

    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      // 失敗時は直前の値へ戻す
      setTitle(card.title);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        maxLength={200}
        className="w-full rounded-md border border-blue-400 bg-white px-2 py-1 text-sm"
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded-md bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
    >
      {card.title}
    </div>
  );
}
