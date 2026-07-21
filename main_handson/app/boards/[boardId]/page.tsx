// spec/001 / 005 / 006 / 007 / 008 § 画面（ボード詳細）
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { boardRepository } from "@/lib/repository/board";
import { listRepository } from "@/lib/repository/list";
import { cardRepository } from "@/lib/repository/card";
import { labelRepository } from "@/lib/repository/label";
import { checkBoardAccess } from "@/lib/auth/permissions";
import AppShell from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import BoardHeader from "./_components/BoardHeader";
import ListCreateForm from "./_components/ListCreateForm";
import BoardWorkspace from "./_components/BoardWorkspace";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ boardId: string }> };

export default async function BoardDetailPage({ params }: PageProps) {
  const { boardId } = await params;

  // 認証 → 対象存在 → 権限（非メンバーは 404 相当）
  const access = await checkBoardAccess(boardId, "viewer");
  if (access.kind === "unauthorized") redirect("/login");
  if (access.kind !== "ok") notFound();

  const board = await boardRepository.findById(boardId);
  if (!board) notFound();

  const allBoards = await boardRepository.listForUser(access.user.id);
  const lists = await listRepository.findByBoard(boardId);
  const listsWithCards = await Promise.all(
    lists.map(async (list) => ({
      list,
      cards: await cardRepository.findByListWithLabels(list.id),
    })),
  );
  const boardLabels = await labelRepository.listByBoard(boardId);

  return (
    <AppShell
      user={access.user}
      boards={allBoards.map((b) => ({ id: b.id, title: b.title }))}
      activeBoardId={boardId}
      breadcrumb={[
        { label: "ボード一覧", href: "/" },
        { label: board.title },
      ]}
    >
      <div className="w-full max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4 flex justify-end">
          <Link
            href={`/boards/${boardId}/members`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            メンバー
          </Link>
        </div>
        <BoardHeader board={board} />
        <div className="mt-6">
          <ListCreateForm boardId={boardId} />
        </div>

        {listsWithCards.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            まだリストがありません。「リスト作成」から追加できます。
          </p>
        ) : (
          <BoardWorkspace
            boardId={boardId}
            columns={listsWithCards}
            boardLabels={boardLabels}
            lists={lists.map((l) => ({ id: l.id, title: l.title }))}
          />
        )}
      </div>
    </AppShell>
  );
}
