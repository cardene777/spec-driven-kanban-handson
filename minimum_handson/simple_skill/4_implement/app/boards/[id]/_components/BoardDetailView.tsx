// spec/002_lists.md FR-003 / FR-004、spec/003_cards.md FR-003 / FR-004、spec/004_card_edit.md FR-001 / FR-002
"use client";

import { useState } from "react";
import { CardItem } from "./CardItem";

type Card = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  listId: string;
  createdAt: string;
};

type List = {
  id: string;
  title: string;
  order: number;
  boardId: string;
  createdAt: string;
  cards: Card[];
};

export function BoardDetailView({
  boardId,
  initialLists,
}: {
  boardId: string;
  initialLists: List[];
}) {
  const [lists, setLists] = useState<List[]>(initialLists);
  const [isListFormOpen, setIsListFormOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [isListSubmitting, setIsListSubmitting] = useState(false);

  async function submitList(e: React.FormEvent) {
    e.preventDefault();
    setListError(null);
    setIsListSubmitting(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: listTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setListError(data?.error?.message ?? "作成に失敗しました");
        return;
      }
      setLists((prev) => [...prev, { ...data.list, cards: [] }]);
      setListTitle("");
      setIsListFormOpen(false);
    } catch {
      setListError("通信エラーが発生しました");
    } finally {
      setIsListSubmitting(false);
    }
  }

  function upsertCardInList(listId: string, card: Card) {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              cards: l.cards.some((c) => c.id === card.id)
                ? l.cards.map((c) => (c.id === card.id ? card : c))
                : [...l.cards, card],
            },
      ),
    );
  }

  return (
    <div>
      <div className="mb-4">
        {!isListFormOpen ? (
          <button
            type="button"
            onClick={() => setIsListFormOpen(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            リスト作成
          </button>
        ) : (
          <form
            onSubmit={submitList}
            className="flex flex-col gap-2 rounded border bg-white p-4"
          >
            <label className="text-sm font-medium">リスト名</label>
            <input
              type="text"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              autoFocus
              className="rounded border px-3 py-2"
              placeholder="例: 進行中"
            />
            {listError && <p className="text-sm text-red-600">{listError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isListSubmitting}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                作成
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsListFormOpen(false);
                  setListTitle("");
                  setListError(null);
                }}
                className="rounded border px-4 py-2 hover:bg-zinc-100"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>

      {lists.length === 0 ? (
        <p className="text-zinc-500">まだリストがありません</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {lists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              onCardCreated={(card) => upsertCardInList(list.id, card)}
              onCardUpdated={(card) => upsertCardInList(list.id, card)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListColumn({
  list,
  onCardCreated,
  onCardUpdated,
}: {
  list: List;
  onCardCreated: (card: Card) => void;
  onCardUpdated: (card: Card) => void;
}) {
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    setCardError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/lists/${list.id}/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: cardTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCardError(data?.error?.message ?? "作成に失敗しました");
        return;
      }
      onCardCreated(data.card);
      setCardTitle("");
      setIsCardFormOpen(false);
    } catch {
      setCardError("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex w-72 shrink-0 flex-col gap-3 rounded bg-zinc-100 p-3">
      <h2 className="text-sm font-semibold text-zinc-700">{list.title}</h2>
      <ul className="flex flex-col gap-2">
        {list.cards.map((c) => (
          <li key={c.id}>
            <CardItem card={c} onUpdated={onCardUpdated} />
          </li>
        ))}
      </ul>
      {!isCardFormOpen ? (
        <button
          type="button"
          onClick={() => setIsCardFormOpen(true)}
          className="rounded border border-dashed border-zinc-400 py-2 text-sm text-zinc-600 hover:bg-white"
        >
          + カード追加
        </button>
      ) : (
        <form onSubmit={submitCard} className="flex flex-col gap-2">
          <input
            type="text"
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            autoFocus
            className="rounded border px-3 py-2 text-sm"
            placeholder="カードのタイトル"
          />
          {cardError && <p className="text-xs text-red-600">{cardError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCardFormOpen(false);
                setCardTitle("");
                setCardError(null);
              }}
              className="rounded border px-3 py-1 text-sm hover:bg-white"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
