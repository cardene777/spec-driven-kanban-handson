"use client";

// spec/004_card_movement_archive_restore.md § 画面（ドラッグ&ドロップ）
// HTML5 Drag and Drop API（依存追加なし）。ドロップ確定で move / list move API を呼ぶ。
import { useState } from "react";
import { useRouter } from "next/navigation";
import CardItem from "./CardItem";
import CardCreateForm from "./CardCreateForm";
import ListHeader from "./ListHeader";

type Label = { id: string; name: string; color: string };
type Card = {
  id: string;
  listId: string;
  title: string;
  description: string;
  order: number;
  dueDate?: string | Date | null;
  labels?: Label[];
};
type List = { id: string; boardId: string; title: string; order: number };
export type Column = { list: List; cards: Card[] };

type Drag =
  | { type: "card"; cardId: string; sourceListId: string }
  | { type: "list"; listId: string }
  | null;

export default function Board({
  columns,
  boardLabels = [],
  filteredCardIds = null,
}: {
  columns: Column[];
  boardLabels?: Label[];
  filteredCardIds?: string[] | null;
}) {
  const router = useRouter();
  const [drag, setDrag] = useState<Drag>(null);
  const visible = filteredCardIds === null ? null : new Set(filteredCardIds);

  async function moveCard(targetListId: string, targetOrder: number) {
    if (!drag || drag.type !== "card") return;
    await fetch(`/api/cards/${drag.cardId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceListId: drag.sourceListId,
        targetListId,
        targetOrder,
      }),
    });
    setDrag(null);
    router.refresh();
  }

  async function moveList(targetOrder: number) {
    if (!drag || drag.type !== "list") return;
    await fetch(`/api/lists/${drag.listId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetOrder }),
    });
    setDrag(null);
    router.refresh();
  }

  function dropOnColumn(col: Column, colIndex: number) {
    if (drag?.type === "list") {
      moveList(colIndex);
    } else if (drag?.type === "card") {
      // 空きエリアへのドロップ = 末尾へ。同一リストは対象を除いた末尾 index。
      const append =
        drag.sourceListId === col.list.id ? col.cards.length - 1 : col.cards.length;
      moveCard(col.list.id, Math.max(0, append));
    }
  }

  return (
    <div className="mt-6 flex flex-nowrap gap-4 overflow-x-auto pb-4">
      {columns.map((col, colIndex) => (
        <section
          key={col.list.id}
          className="w-72 shrink-0 rounded-lg bg-secondary p-3"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDrag({ type: "list", listId: col.list.id });
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            dropOnColumn(col, colIndex);
          }}
        >
          <ListHeader list={col.list} />
          <ul className="flex min-h-3 flex-col gap-2">
            {col.cards
              .filter((card) => visible === null || visible.has(card.id))
              .map((card, cardIndex) => (
                <li
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDrag({ type: "card", cardId: card.id, sourceListId: col.list.id });
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (drag?.type === "card") moveCard(col.list.id, cardIndex);
                  }}
                >
                  <CardItem card={card} boardLabels={boardLabels} />
                </li>
              ))}
          </ul>
          <div className="mt-3">
            <CardCreateForm listId={col.list.id} />
          </div>
        </section>
      ))}
    </div>
  );
}
