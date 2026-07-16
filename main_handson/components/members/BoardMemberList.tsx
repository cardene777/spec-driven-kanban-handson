// design/013_permissions.md § 主要 Client Component > BoardMemberList
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member" | "viewer";
  createdAt: string;
};

type Props = {
  boardId: string;
  members: Member[];
  currentUserId: string;
  currentRole: "owner" | "member" | "viewer";
};

// 置換対象 15 component に <select> は含まれないため、native のまま token 由来 class で見た目だけ統一する。
const selectClass =
  "rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

function initials(name: string): string {
  const t = name.trim();
  return t ? t.slice(0, 2).toUpperCase() : "?";
}

export default function BoardMemberList({
  boardId,
  members,
  currentUserId,
  currentRole,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = currentRole === "owner";

  const changeRole = async (userId: string, role: string) => {
    setBusy(userId);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/boards/${boardId}/members/${userId}`,
        { method: "PATCH", body: JSON.stringify({ role }) },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        if (
          res.status === 422 &&
          (data.fields?.role === "last_owner" ||
            data.fields?.userId === "last_owner")
        ) {
          setError("最後の owner は降格 / 削除できません。");
        } else {
          setError("ロール変更に失敗しました。");
        }
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (userId: string) => {
    if (!window.confirm("削除しますか?")) return;
    setBusy(userId);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/boards/${boardId}/members/${userId}`,
        { method: "DELETE" },
      );
      if (res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        if (
          res.status === 422 &&
          (data.fields?.role === "last_owner" ||
            data.fields?.userId === "last_owner")
        ) {
          setError("最後の owner は削除できません。");
        } else if (res.status === 403) {
          setError("削除権限がありません。");
        } else {
          setError("削除に失敗しました。");
        }
      } else if (userId === currentUserId) {
        router.push("/");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メンバー</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            return (
              <TableRow key={m.userId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {m.email}
                </TableCell>
                <TableCell>
                  {isOwner ? (
                    <select
                      className={selectClass}
                      value={m.role}
                      disabled={busy === m.userId}
                      onChange={(e) => changeRole(m.userId, e.target.value)}
                    >
                      <option value="owner">owner</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <Badge variant="secondary">{m.role}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isOwner || isSelf ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      disabled={busy === m.userId}
                      onClick={() => remove(m.userId)}
                    >
                      {isSelf ? "脱退" : "削除"}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
