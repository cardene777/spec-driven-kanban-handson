// design/012_member_invite.md § 主要 Client Component > InviteAcceptPanel
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

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

  const disabled =
    invite.expired || invite.status !== "pending" || busy;

  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-semibold">ボード招待</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="inline text-gray-500">ボード名: </dt>
          <dd className="inline">{invite.boardTitle}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">付与ロール: </dt>
          <dd className="inline">{invite.role}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">状態: </dt>
          <dd className="inline">{invite.status}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">有効期限: </dt>
          <dd className="inline">{invite.expiresAt}</dd>
        </div>
      </dl>

      {invite.expired ? (
        <p className="mt-4 text-sm text-red-600">この招待は期限切れです。</p>
      ) : invite.status === "revoked" ? (
        <p className="mt-4 text-sm text-red-600">この招待は失効済みです。</p>
      ) : invite.status === "accepted" ? (
        <p className="mt-4 text-sm text-red-600">
          この招待は既に使用されています。
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      ) : null}

      <div className="mt-6">
        {!isLoggedIn ? (
          <Link
            href={`/login?returnTo=/invites/${token}`}
            className="inline-block rounded bg-blue-600 px-3 py-2 text-white"
          >
            ログインして承認する
          </Link>
        ) : (
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
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
          </button>
        )}
      </div>
    </div>
  );
}
