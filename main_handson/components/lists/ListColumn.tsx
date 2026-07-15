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
    <div className="flex w-80 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-0 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
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
            className="flex-1 rounded-lg border border-neutral-300 bg-neutral-0 px-2 py-1 text-sm font-medium text-neutral-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
            autoFocus
          />
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <h2
              className="cursor-pointer text-sm font-semibold text-neutral-800"
              onClick={() => canWrite && setEditing(true)}
            >
              {list.title}
            </h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-xs font-medium text-neutral-600">
              {cards.length}
            </span>
          </div>
        )}
        {canWrite && !editing ? (
          <button
            onClick={remove}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label={`リスト ${list.title} を削除`}
            title="削除"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 p-3">
        {error ? (
          <div className="rounded-lg border border-danger-border bg-danger-soft px-2 py-1.5 text-xs text-danger">
            {error}
          </div>
        ) : null}

        {cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-6 text-center text-xs text-neutral-400">
            カードなし
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <li key={card.id}>
                <CardRow card={card} boardId={list.boardId} />
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          <div className="mt-1">
            <CardCreateForm listId={list.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
