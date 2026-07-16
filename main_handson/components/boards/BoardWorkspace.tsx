"use client";

import { useState } from "react";
import ListColumn from "@/components/lists/ListColumn";
import BoardSearchBar from "@/components/search/BoardSearchBar";
import type { CardRowData } from "@/components/cards/CardRow";
import type { Label } from "@/lib/labels/colors";

type ListData = {
  id: string;
  boardId: string;
  title: string;
  order: number;
  cards: (CardRowData & { listId: string })[];
};

// design/008_search_filter.md § Template > BoardDetailClientShell
// 検索結果 (visibleCardIds) を保持し、各 ListColumn に伝搬する Client シェル。
export default function BoardWorkspace({
  boardId,
  lists,
  canWrite,
  boardLabels,
  boardMembers,
  currentUserId,
}: {
  boardId: string;
  lists: ListData[];
  canWrite: boolean;
  boardLabels: Label[];
  boardMembers: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [visibleCardIds, setVisibleCardIds] = useState<Set<string> | null>(null);
  const filterActive = visibleCardIds !== null;

  return (
    <div className="space-y-4">
      <BoardSearchBar
        boardId={boardId}
        boardLabels={boardLabels}
        boardMembers={boardMembers}
        currentUserId={currentUserId}
        onResultChange={setVisibleCardIds}
      />

      <section className="flex gap-4 overflow-x-auto pb-4">
        {lists.length === 0 ? (
          <div className="w-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            まだリストがありません。 上のフォームから新規作成してください。
          </div>
        ) : (
          lists.map((list) => (
            <ListColumn
              key={list.id}
              list={{
                id: list.id,
                boardId: list.boardId,
                title: list.title,
                order: list.order,
              }}
              cards={list.cards}
              canWrite={canWrite}
              visibleCardIds={visibleCardIds}
              filterActive={filterActive}
            />
          ))
        )}
      </section>
    </div>
  );
}
