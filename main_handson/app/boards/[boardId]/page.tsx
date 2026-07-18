// spec/001_boards.md § 画面 / ボード詳細
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/currentUser";
import { boardRepository } from "@/lib/repository/board";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
import { checkBoardAccess } from "@/lib/auth/requireBoardRole";
import ListColumn from "./_components/ListColumn";
import ListCreateForm from "./_components/ListCreateForm";
import BoardHeader from "./_components/BoardHeader";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ boardId: string }> };

export default async function BoardDetailPage({ params }: PageProps) {
  const { boardId } = await params;
  const user = await currentUser();
  if (!user) notFound();

  const access = await checkBoardAccess(user.id, boardId, "viewer");
  if (access.kind !== "ok") notFound();

  const board = await boardRepository.findById(boardId);
  if (!board) notFound();

  const lists = await listRepository.findByBoard(boardId);
  const listsWithCards = await Promise.all(
    lists.map(async (list) => ({
      list,
      cards: await cardRepository.findByList(list.id),
    })),
  );

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
      <div className="mb-4">
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← ボード一覧
        </Link>
      </div>
      <BoardHeader board={board} canWrite={access.role === "owner"} />
      <div className="mt-6">
        <ListCreateForm boardId={boardId} />
      </div>

      {listsWithCards.length === 0 ? (
        <p className="mt-6 text-slate-500">
          まだリストがありません。「リスト作成」から追加できます。
        </p>
      ) : (
        <div className="mt-6 flex flex-nowrap gap-4 overflow-x-auto pb-4">
          {listsWithCards.map(({ list, cards }) => (
            <ListColumn key={list.id} list={list} cards={cards} />
          ))}
        </div>
      )}
    </main>
  );
}
