"use client";

// FR-301 カード一覧表示、FR-303 カード追加後・FR-402 編集後の GET API による更新
import { useState } from "react";
import { CardItem } from "@/app/boards/[id]/_components/CardItem";
import { CardCreateForm } from "@/app/boards/[id]/_components/CardCreateForm";

type Card = { id: string; title: string; order: number };
type ListSummary = { id: string; title: string; order: number };

export function ListColumn({
  list,
  initialCards,
}: {
  list: ListSummary;
  initialCards: Card[];
}) {
  const [cards, setCards] = useState<Card[]>(initialCards);

  // FR-304 GET /api/lists/[id]/cards でカード一覧を取り直す（order 昇順）
  async function refreshCards() {
    const res = await fetch(`/api/lists/${list.id}/cards`);
    if (!res.ok) return;
    const data: Card[] = await res.json();
    setCards(data.map((c) => ({ id: c.id, title: c.title, order: c.order })));
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-gray-100 p-3">
      <h2 className="font-semibold break-words">{list.title}</h2>

      <ul className="flex flex-col gap-2">
        {cards.map((card) => (
          <li key={card.id}>
            {/* FR-401 / FR-402 カードタイトルのインライン編集 */}
            <CardItem card={card} onSaved={refreshCards} />
          </li>
        ))}
      </ul>

      {/* FR-302 リスト末尾に「カード追加」ボタン */}
      <CardCreateForm listId={list.id} onCreated={refreshCards} />
    </div>
  );
}
