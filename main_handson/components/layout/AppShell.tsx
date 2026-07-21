"use client";

// design-system: sidebar + top header の共通レイアウト（Height tone）
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, LayoutGrid, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/mockMeta";

type Props = {
  user: { id: string; name: string; email: string };
  boards: { id: string; title: string }[];
  activeBoardId?: string;
  breadcrumb?: { label: string; href?: string }[];
  children: React.ReactNode;
};

export default function AppShell({
  user,
  boards,
  activeBoardId,
  breadcrumb = [],
  children,
}: Props) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh w-full">
      {/* 左 sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold text-sidebar-foreground">
            Simple Kanban
          </span>
        </div>

        <Separator className="bg-sidebar-border" />

        <nav className="px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LayoutGrid className="size-4" />
            ボード一覧
          </Link>
        </nav>

        <div className="px-4 py-2">
          <p className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            最近のボード
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {boards.slice(0, 6).map((b) => (
              <li key={b.id}>
                <Link
                  href={`/boards/${b.id}`}
                  className={`block truncate rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                    b.id === activeBoardId
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground"
                  }`}
                >
                  {b.title}
                </Link>
              </li>
            ))}
            {boards.length === 0 && (
              <li className="px-3 py-1.5 text-xs text-muted-foreground">なし</li>
            )}
          </ul>
        </div>

        <div className="mt-auto p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-sidebar-foreground">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                </button>
              }
            />
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="size-4" /> 設定
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" /> ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* 右カラム: header + main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-6">
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
            {breadcrumb.length === 0 ? (
              <span className="text-muted-foreground">Simple Kanban</span>
            ) : (
              breadcrumb.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
                  {c.href ? (
                    <Link href={c.href} className="text-muted-foreground hover:text-foreground">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{c.label}</span>
                  )}
                </span>
              ))
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="通知">
              <Bell className="size-4" />
            </Button>
            <Avatar className="size-8">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
