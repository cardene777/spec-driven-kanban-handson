"use client";

// FR-201 リスト一覧表示、FR-203 リスト作成後の GET API による更新
import { useMemo, useState } from "react";
import { ListCreateForm } from "@/app/boards/[id]/_components/ListCreateForm";
import { ListColumn } from "@/app/boards/[id]/_components/ListColumn";

type Card = { id: string; title: string; order: number };
type ListWithCards = { id: string; title: string; order: number; cards: Card[] };
type ListSummary = { id: string; title: string; order: number };

export function BoardDetail({
  boardId,
  initialLists,
}: {
  boardId: string;
  initialLists: ListWithCards[];
}) {
  const [lists, setLists] = useState<ListSummary[]>(
    initialLists.map((l) => ({ id: l.id, title: l.title, order: l.order })),
  );

  // 初期カードは各 ListColumn のマウント時にのみ渡す（以後は ListColumn 側が管理する）
  const initialCardsByListId = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const l of initialLists) map[l.id] = l.cards;
    return map;
  }, [initialLists]);

  // FR-204 GET /api/boards/[id]/lists で一覧を取り直す（order 昇順）
  async function refreshLists() {
    const res = await fetch(`/api/boards/${boardId}/lists`);
    if (!res.ok) return;
    const data: ListSummary[] = await res.json();
    setLists(data.map((l) => ({ id: l.id, title: l.title, order: l.order })));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <ListCreateForm boardId={boardId} onCreated={refreshLists} />
      </div>

      {lists.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだリストがありません。「リスト作成」から作成してください。
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {lists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              initialCards={initialCardsByListId[list.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
