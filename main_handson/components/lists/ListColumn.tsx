"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import CardRow, { type CardRowData } from "@/components/cards/CardRow";
import CardCreateForm from "@/components/cards/CardCreateForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ListSummary = {
  id: string;
  boardId: string;
  title: string;
  order: number;
};

type CardSummary = CardRowData & { listId: string };

export default function ListColumn({
  list,
  cards,
  canWrite,
  visibleCardIds = null,
  filterActive = false,
}: {
  list: ListSummary;
  cards: CardSummary[];
  canWrite: boolean;
  visibleCardIds?: Set<string> | null;
  filterActive?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [error, setError] = useState<string | null>(null);

  // 検索 / 絞り込み適用中は結果集合に含まれるカードのみ表示する。
  const visibleCards =
    visibleCardIds === null
      ? cards
      : cards.filter((c) => visibleCardIds.has(c.id));

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
    <div className="w-72 shrink-0 rounded-lg border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {editing ? (
          <Input
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
            className="h-8 flex-1"
            autoFocus
          />
        ) : (
          <h2
            className="flex flex-1 cursor-pointer items-center gap-2 font-medium"
            onClick={() => canWrite && setEditing(true)}
          >
            <span className="truncate">{list.title}</span>
            <Badge variant="secondary">{visibleCards.length}</Badge>
          </h2>
        )}
        {canWrite && !editing ? (
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0 text-destructive"
            onClick={remove}
          >
            削除
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-2 text-xs text-destructive">{error}</div>
      ) : null}

      <ul className="mb-2 space-y-2">
        {visibleCards.length === 0 ? (
          <li className="rounded-md border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground">
            {filterActive ? "該当するカードがありません" : "カードなし"}
          </li>
        ) : (
          visibleCards.map((card) => (
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
