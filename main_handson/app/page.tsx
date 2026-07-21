// spec/001_boards.md § 画面（ボード一覧）/ spec/013_permissions.md
import Link from "next/link";
import { redirect } from "next/navigation";
import { boardRepository } from "@/lib/repository/board";
import { getSessionUser } from "@/lib/auth/session";
import AppShell from "@/components/layout/AppShell";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { boardStats, initials } from "@/lib/mockMeta";
import BoardCreateForm from "./_components/BoardCreateForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // メンバーであるボードのみ
  const boards = await boardRepository.listForUser(user.id);

  return (
    <AppShell
      user={user}
      boards={boards.map((b) => ({ id: b.id, title: b.title }))}
      breadcrumb={[{ label: "ボード一覧" }]}
    >
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-semibold">ボード一覧</h1>
          <BoardCreateForm />
        </header>

        {boards.length === 0 ? (
          <p className="text-muted-foreground">
            まだボードがありません。「新規ボード作成」から作成できます。
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => {
              const stats = boardStats(board.id);
              return (
                <li key={board.id}>
                  <Link href={`/boards/${board.id}`} className="block">
                    <Card className="h-full transition-colors hover:border-primary/50">
                      <CardHeader>
                        <CardTitle className="font-heading">{board.title}</CardTitle>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="secondary">カード {stats.total}</Badge>
                          <Badge className="border-transparent bg-[var(--brand-success)]/15 text-[var(--brand-success)]">
                            完了 {stats.done}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent />
                      <CardFooter className="justify-between">
                        <div className="flex -space-x-2">
                          {stats.members.slice(0, 3).map((m) => (
                            <Avatar
                              key={m.id}
                              className="size-6 ring-2 ring-card"
                              aria-label={m.name}
                            >
                              <AvatarFallback className="text-xs">
                                {initials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {stats.members.length > 3 && (
                            <span className="grid size-6 place-items-center rounded-full bg-muted text-xs text-muted-foreground ring-2 ring-card">
                              +{stats.members.length - 3}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {stats.updatedLabel}
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
