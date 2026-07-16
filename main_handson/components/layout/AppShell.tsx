// design-system: sidebar + top header の共通 layout。
// 主要ページ (ボード一覧 / ボード詳細 / メンバー管理) をこの枠で包む。
import Link from "next/link";
import { Bell, LayoutGrid, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import LogoutButton from "@/components/auth/LogoutButton";

type Crumb = { label: string; href?: string };

type Props = {
  user: { id: string; name: string; email: string };
  boards: { id: string; title: string }[];
  activeBoardId?: string;
  breadcrumb?: Crumb[];
  children: React.ReactNode;
};

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}

export default function AppShell({
  user,
  boards,
  activeBoardId,
  breadcrumb = [],
  children,
}: Props) {
  return (
    <div className="flex min-h-full w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold text-sidebar-foreground">
            Simple Kanban
          </span>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1 px-3 py-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground"
            render={<Link href="/" />}
          >
            <LayoutGrid className="size-4" />
            ボード一覧
          </Button>
          {activeBoardId ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground"
              render={<Link href={`/boards/${activeBoardId}/members`} />}
            >
              <Users className="size-4" />
              メンバー / 招待
            </Button>
          ) : null}
        </nav>

        <Separator />

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            最近のボード
          </p>
          <ul className="flex flex-col gap-0.5 overflow-y-auto">
            {boards.length === 0 ? (
              <li className="px-2 py-1 text-xs text-muted-foreground">
                まだボードがありません
              </li>
            ) : (
              boards.slice(0, 8).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/boards/${b.id}`}
                    className={
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground " +
                      (b.id === activeBoardId
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground")
                    }
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="truncate">{b.title}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <Separator />

        <div className="flex items-center gap-2 px-3 py-3">
          <Avatar size="sm">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            {breadcrumb.length === 0 ? (
              <span className="font-medium text-foreground">Simple Kanban</span>
            ) : (
              breadcrumb.map((c, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 ? (
                    <span className="text-muted-foreground">/</span>
                  ) : null}
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="truncate text-muted-foreground hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate font-medium text-foreground">
                      {c.label}
                    </span>
                  )}
                </span>
              ))
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4" />
              <Badge className="absolute -top-0.5 -right-0.5 size-2 rounded-full p-0" />
              <span className="sr-only">通知</span>
            </Button>
            <Avatar size="sm">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
