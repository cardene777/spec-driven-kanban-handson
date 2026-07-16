// design/012_member_invite.md § 主要 Client Component > InviteList (owner 向け pending 一覧 + resend / revoke)
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Invite = {
  id: string;
  email: string;
  role: "owner" | "member" | "viewer";
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
};

export default function InviteList({
  boardId,
  invites,
}: {
  boardId: string;
  invites: Invite[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const resend = async (inviteId: string) => {
    setBusy(inviteId);
    setMessage(null);
    try {
      const res = await apiFetch(
        `/api/boards/${boardId}/invites/${inviteId}/resend`,
        { method: "POST" },
      );
      if (res.status === 200) {
        const data = await res.json();
        setMessage(`新しい招待 URL: ${data.url}`);
        router.refresh();
      } else {
        setMessage("再送に失敗しました。");
      }
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (inviteId: string) => {
    if (!window.confirm("この招待を失効させますか?")) return;
    setBusy(inviteId);
    setMessage(null);
    try {
      const res = await apiFetch(
        `/api/boards/${boardId}/invites/${inviteId}/revoke`,
        { method: "POST" },
      );
      if (res.status === 200) {
        router.refresh();
      } else {
        setMessage("失効に失敗しました。");
      }
    } finally {
      setBusy(null);
    }
  };

  if (invites.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        pending の招待はありません。
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {message ? (
        <div className="border-b border-border bg-accent/40 px-4 py-2 text-xs break-all text-accent-foreground">
          {message}
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メール</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>有効期限</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>{inv.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{inv.role}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {inv.expiresAt}
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={busy === inv.id}
                  onClick={() => resend(inv.id)}
                >
                  再送
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  disabled={busy === inv.id}
                  onClick={() => revoke(inv.id)}
                >
                  失効
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
