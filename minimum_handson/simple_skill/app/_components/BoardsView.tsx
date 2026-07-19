"use client";

// FR-101 / FR-102 / FR-103 ボード一覧の表示と、作成後の GET API による更新
import { useState } from "react";
import Link from "next/link";
import { BoardCreateForm } from "@/app/_components/BoardCreateForm";

type Board = { id: string; title: string };

export function BoardsView({ initialBoards }: { initialBoards: Board[] }) {
  const [boards, setBoards] = useState<Board[]>(initialBoards);

  // FR-104 GET /api/boards で一覧を取り直す（createdAt 降順）
  async function refresh() {
    const res = await fetch("/api/boards");
    if (!res.ok) return;
    const data: Board[] = await res.json();
    setBoards(data.map((b) => ({ id: b.id, title: b.title })));
  }

  return (
    <div>
      <BoardCreateForm onCreated={refresh} />

      {boards.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          まだボードがありません。「新規ボード作成」から作成してください。
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              {/* FR-101 各ボードカードから /boards/[id] へ遷移 */}
              <Link
                href={`/boards/${board.id}`}
                className="block rounded-lg border border-gray-200 p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="font-medium break-words">{board.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
