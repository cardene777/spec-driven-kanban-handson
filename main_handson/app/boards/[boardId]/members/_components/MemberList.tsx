"use client";

// spec/013_permissions.md § 画面（メンバー一覧・ロール変更・削除）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/mockMeta";

type Role = "owner" | "member" | "viewer";
type Member = { userId: string; name: string; email: string; role: Role };

const SELECT_CLS =
  "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export default function MemberList({
  boardId,
  members,
  isOwner,
  currentUserId,
}: {
  boardId: string;
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ownerCount = members.filter((m) => m.role === "owner").length;

  async function changeRole(userId: string, role: Role) {
    setError(null);
    const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "ロールを変更できませんでした");
      return;
    }
    router.refresh();
  }

  async function remove(userId: string) {
    if (!confirm("このメンバーをボードから削除します。よろしいですか？")) return;
    setError(null);
    const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "メンバーを削除できませんでした");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">メンバー一覧（{members.length}）</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-xs text-destructive">{error}</p>}
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            // 最後の owner は降格・削除できない
            const isLastOwner = m.role === "owner" && ownerCount <= 1;
            return (
              <li
                key={m.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {m.userId === currentUserId && (
                        <span className="ml-1 text-xs text-muted-foreground">(自分)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <>
                      <select
                        aria-label={`${m.name} のロール`}
                        className={SELECT_CLS}
                        value={m.role}
                        disabled={isLastOwner}
                        onChange={(e) => changeRole(m.userId, e.target.value as Role)}
                      >
                        <option value="owner">owner</option>
                        <option value="member">member</option>
                        <option value="viewer">viewer</option>
                      </select>
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={isLastOwner}
                        onClick={() => remove(m.userId)}
                      >
                        削除
                      </Button>
                    </>
                  ) : (
                    <Badge variant="secondary">{m.role}</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {isOwner && ownerCount <= 1 && (
          <p className="text-xs text-muted-foreground">
            最後のオーナーは降格・削除できません。先に別のメンバーをオーナーにしてください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
