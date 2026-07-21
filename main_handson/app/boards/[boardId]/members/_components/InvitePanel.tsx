"use client";

// spec/012_member_invite.md § 画面（招待の作成・再送・失効・リンク表示）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
};

const SELECT_CLS =
  "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

const STATUS_LABEL: Record<string, string> = {
  pending: "招待中",
  accepted: "参加済み",
  revoked: "失効",
};

export default function InvitePanel({
  boardId,
  invites,
}: {
  boardId: string;
  invites: Invite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/boards/${boardId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error?.message ?? "招待を作成できませんでした");
      return;
    }
    setLastLink(body?.inviteUrl ?? null);
    setEmail("");
    router.refresh();
  }

  async function act(inviteId: string, action: "resend" | "revoke") {
    setError(null);
    const res = await fetch(`/api/invites/${inviteId}/${action}`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error?.message ?? "操作できませんでした");
      return;
    }
    if (action === "resend") setLastLink(body?.inviteUrl ?? null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">メンバーを招待</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">メールアドレス</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="w-64"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">ロール</Label>
            <select
              id="invite-role"
              className={SELECT_CLS}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <Button type="submit">招待する</Button>
        </form>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {lastLink && (
          <div className="rounded-md border border-border bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">招待リンク（コピーして共有してください）</p>
            <code className="block truncate text-xs">{lastLink}</code>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold">招待一覧（{invites.length}）</h3>
          {invites.length === 0 ? (
            <p className="text-xs text-muted-foreground">招待はありません</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invites.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{i.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.role} ・ 期限 {String(i.expiresAt).slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={i.status === "pending" ? "secondary" : "outline"}>
                      {STATUS_LABEL[i.status] ?? i.status}
                    </Badge>
                    {i.status === "pending" && (
                      <>
                        <Button variant="outline" size="xs" onClick={() => act(i.id, "resend")}>
                          再送
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => act(i.id, "revoke")}
                        >
                          失効
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
