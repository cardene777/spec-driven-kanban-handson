// design/012_member_invite.md § 主要 Client Component > InviteAcceptPanel
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type InviteView = {
  boardId: string;
  boardTitle: string;
  role: "owner" | "member" | "viewer";
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  expired: boolean;
};

type Props = {
  token: string;
  invite: InviteView;
  isLoggedIn: boolean;
};

export default function InviteAcceptPanel({ token, invite, isLoggedIn }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = invite.expired || invite.status !== "pending" || busy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">ボード招待</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="inline text-muted-foreground">ボード名: </dt>
            <dd className="inline font-medium">{invite.boardTitle}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">付与ロール</dt>
            <dd>
              <Badge variant="secondary">{invite.role}</Badge>
            </dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">状態: </dt>
            <dd className="inline">{invite.status}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">有効期限: </dt>
            <dd className="inline">{invite.expiresAt}</dd>
          </div>
        </dl>

        {invite.expired ? (
          <p className="mt-4 text-sm text-destructive">
            この招待は期限切れです。
          </p>
        ) : invite.status === "revoked" ? (
          <p className="mt-4 text-sm text-destructive">
            この招待は失効済みです。
          </p>
        ) : invite.status === "accepted" ? (
          <p className="mt-4 text-sm text-destructive">
            この招待は既に使用されています。
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 text-sm text-destructive">{message}</p>
        ) : null}

        <div className="mt-6">
          {!isLoggedIn ? (
            <Button render={<Link href={`/login?returnTo=/invites/${token}`} />}>
              ログインして承認する
            </Button>
          ) : (
            <Button
              type="button"
              disabled={disabled}
              onClick={async () => {
                setBusy(true);
                setMessage(null);
                try {
                  const res = await apiFetch(`/api/invites/${token}/accept`, {
                    method: "POST",
                  });
                  if (res.status === 200) {
                    router.push(`/boards/${invite.boardId}`);
                    router.refresh();
                    return;
                  }
                  const data = await res.json().catch(() => ({}));
                  if (res.status === 410) {
                    const reason = data.reason as string | undefined;
                    const map: Record<string, string> = {
                      expired: "この招待は期限切れです。",
                      revoked: "この招待は失効済みです。",
                      already_used: "この招待は既に使用されています。",
                    };
                    setMessage(map[reason ?? ""] ?? "承認できません。");
                  } else if (res.status === 409) {
                    setMessage("既にこのボードのメンバーです。");
                  } else if (res.status === 401) {
                    router.push(`/login?returnTo=/invites/${token}`);
                  } else {
                    setMessage("承認に失敗しました。");
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "承認中..." : "承認する"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
