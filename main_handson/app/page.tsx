// spec/001_boards.md § 画面: ボード一覧 / design/001_boards.md § UI 構造
// design/011_auth.md § UI 構造 (未ログインは /login へ redirect、Cookie ベースの currentUser)
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth/currentUserFromCookies";
import AppShell from "@/components/layout/AppShell";
import BoardCreateForm from "@/components/boards/BoardCreateForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// rich meta 用のデモ mock。book 完成イメージ向けの見た目確認用で、
// 本番運用時は board ごとの実データ (メンバー / カード数 / 最終更新) 取得に置き換える。
const fakeMeta = [
  { members: ["AK", "MT", "RS"], extra: 2, cards: 12, activity: "2 時間前" },
  { members: ["YS", "KN"], extra: 0, cards: 4, activity: "昨日" },
  { members: ["Ht", "Sa", "Kz"], extra: 5, cards: 27, activity: "3 日前" },
];

export default async function HomePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const memberships = await prisma.boardMembership.findMany({
    where: { userId: user.id },
    include: { board: true },
  });
  const boards = memberships
    .map((m) => m.board)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  return (
    <AppShell user={user} boards={boards} breadcrumb={[{ label: "ボード一覧" }]}>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-heading text-2xl font-semibold">ボード一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.name} さんが参加しているボード
          </p>
        </header>

        <div className="mb-8">
          <BoardCreateForm />
        </div>

        <section>
          {boards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              まだボードがありません。 上のフォームから新規作成してください。
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {boards.map((board, i) => {
                const meta = fakeMeta[i % fakeMeta.length];
                return (
                  <li key={board.id}>
                    <Link href={`/boards/${board.id}`} className="block">
                      <Card className="transition-colors hover:border-primary/40 hover:bg-accent/40">
                        <CardHeader>
                          <CardTitle className="truncate">
                            {board.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                          <AvatarGroup>
                            {meta.members.map((m) => (
                              <Avatar key={m} size="sm">
                                <AvatarFallback>{m}</AvatarFallback>
                              </Avatar>
                            ))}
                            {meta.extra > 0 ? (
                              <AvatarGroupCount className="size-6 text-xs">
                                +{meta.extra}
                              </AvatarGroupCount>
                            ) : null}
                          </AvatarGroup>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{meta.cards} 枚</Badge>
                            <span className="text-xs text-muted-foreground">
                              {meta.activity}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
