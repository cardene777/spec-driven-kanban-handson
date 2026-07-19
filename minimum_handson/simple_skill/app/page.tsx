// FR-001 / FR-101 ボード一覧画面
// 初期表示は repository から取得し、作成後の一覧更新はクライアントが GET API で行う
import { listBoards } from "@/lib/repository/board";
import { BoardsView } from "@/app/_components/BoardsView";

// 一覧は常に最新の DB を反映する（ビルド時スナップショットの静的化を防ぐ）
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // FR-101 createdAt 降順
  const boards = await listBoards();
  const initialBoards = boards.map((b) => ({ id: b.id, title: b.title }));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">シンプルなカンバン</h1>
      <BoardsView initialBoards={initialBoards} />
    </main>
  );
}
