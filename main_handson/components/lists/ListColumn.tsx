"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import CardRow from "@/components/cards/CardRow";
import CardCreateForm from "@/components/cards/CardCreateForm";

type ListSummary = {
  id: string;
  boardId: string;
  title: string;
  order: number;
};

type CardSummary = {
  id: string;
  listId: string;
  title: string;
  order: number;
};

export default function ListColumn({
  list,
  cards,
  canWrite,
}: {
  list: ListSummary;
  cards: CardSummary[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [error, setError] = useState<string | null>(null);

  async function saveTitle() {
    const res = await apiFetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    if (res.status === 200) {
      setEditing(false);
      setError(null);
      router.refresh();
      return;
    }
    if (res.status === 422) {
      const body = (await res.json()) as {
        fields?: Record<string, string>;
      };
      setError(body.fields?.title ?? "invalid");
      return;
    }
    setError(`error_${res.status}`);
  }

  async function remove() {
    if (!window.confirm(`リスト「${list.title}」 を削除します。 配下のカードも全て消えます。 よろしいですか?`)) {
      return;
    }
    const res = await apiFetch(`/api/lists/${list.id}`, {
      method: "DELETE",
    });
    if (res.status === 204) {
      router.refresh();
      return;
    }
    setError(`error_${res.status}`);
  }

  return (
    <div className="w-72 shrink-0 rounded border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {editing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setEditing(false);
                setTitle(list.title);
              }
            }}
            className="flex-1 rounded border border-gray-300 px-2 py-1"
            autoFocus
          />
        ) : (
          <h2
            className="flex-1 cursor-pointer font-medium"
            onClick={() => canWrite && setEditing(true)}
          >
            {list.title}
            <span className="ml-2 text-xs text-gray-400">
              (order={list.order})
            </span>
          </h2>
        )}
        {canWrite && !editing ? (
          <button
            onClick={remove}
            className="text-xs text-red-600 hover:underline"
          >
            削除
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-2 text-xs text-red-600">{error}</div>
      ) : null}

      <ul className="mb-2 space-y-2">
        {cards.length === 0 ? (
          <li className="rounded border border-dashed border-gray-300 px-3 py-2 text-center text-xs text-gray-500">
            カードなし
          </li>
        ) : (
          cards.map((card) => (
            <li key={card.id}>
              <CardRow card={card} boardId={list.boardId} />
            </li>
          ))
        )}
      </ul>

      {canWrite ? <CardCreateForm listId={list.id} /> : null}
    </div>
  );
}
