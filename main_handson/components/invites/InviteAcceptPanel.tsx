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

const primaryButton =
  "inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-60";

export default function InviteAcceptPanel({ token, invite, isLoggedIn }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const disabled =
    invite.expired || invite.status !== "pending" || busy;

  const statusNotice =
    invite.expired
      ? "この招待は期限切れです。"
      : invite.status === "revoked"
        ? "この招待は失効済みです。"
        : invite.status === "accepted"
          ? "この招待は既に使用されています。"
          : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm">
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 8l-6 6-3-3M4 12a8 8 0 1116 0 8 8 0 01-16 0z" />
          </svg>
          ボード招待
        </div>
        <h2 className="mt-1 text-xl font-semibold text-neutral-900">
          {invite.boardTitle}
        </h2>
      </div>

      <div className="space-y-4 px-6 py-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              付与ロール
            </dt>
            <dd className="mt-1">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-200">
                {invite.role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              状態
            </dt>
            <dd className="mt-1 text-neutral-700">{invite.status}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              有効期限
            </dt>
            <dd className="mt-1 text-neutral-700">
              {new Date(invite.expiresAt).toLocaleString("ja-JP")}
            </dd>
          </div>
        </dl>

        {statusNotice ? (
          <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
            {statusNotice}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
            {message}
          </div>
        ) : null}
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-4">
        {!isLoggedIn ? (
          <Link
            href={`/login?returnTo=/invites/${token}`}
            className={primaryButton}
          >
            ログインして承認する
          </Link>
        ) : (
          <button
            type="button"
            className={primaryButton}
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
