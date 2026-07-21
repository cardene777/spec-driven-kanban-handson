"use client";

// design/005_008_ui_features_ui.md § Template: BoardDetailLayout（クライアント調整層）
// 検索条件・結果を保持し、SearchFilterBar / LabelManager / Board / ArchivePanel を統括する。
import { useState } from "react";
import Board, { type Column } from "./Board";
import SearchFilterBar from "./SearchFilterBar";
import LabelManager from "./LabelManager";
import ArchivePanel from "./ArchivePanel";

type Label = { id: string; name: string; color: string };
type ListRef = { id: string; title: string };

export default function BoardWorkspace({
  boardId,
  columns,
  boardLabels,
  lists,
}: {
  boardId: string;
  columns: Column[];
  boardLabels: Label[];
  lists: ListRef[];
}) {
  const [filteredCardIds, setFilteredCardIds] = useState<string[] | null>(null);

  const totalVisible =
    filteredCardIds === null
      ? columns.reduce((n, c) => n + c.cards.length, 0)
      : filteredCardIds.length;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <SearchFilterBar
        boardId={boardId}
        boardLabels={boardLabels}
        onResult={setFilteredCardIds}
      />
      <LabelManager boardId={boardId} boardLabels={boardLabels} />

      {filteredCardIds !== null && totalVisible === 0 ? (
        <p className="text-muted-foreground">該当するカードがありません</p>
      ) : (
        <Board
          columns={columns}
          boardLabels={boardLabels}
          filteredCardIds={filteredCardIds}
        />
      )}

      <ArchivePanel lists={lists} />
    </div>
  );
}
