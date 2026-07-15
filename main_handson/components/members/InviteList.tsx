// design/012_member_invite.md § 主要 Client Component > InviteList (owner 向け pending 一覧 + resend / revoke)
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

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
    if (!confirm("この招待を失効させますか?")) return;
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
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-400">
        pending の招待はありません
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-sm">
      {message ? (
        <div className="break-all border-b border-primary-200 bg-primary-50 px-4 py-2.5 text-xs text-primary-800">
          {message}
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-4 py-3">メール</th>
            <th className="px-4 py-3">ロール</th>
            <th className="px-4 py-3">有効期限</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {invites.map((inv) => (
            <tr key={inv.id} className="transition-colors hover:bg-neutral-50">
              <td className="px-4 py-3 text-neutral-800">{inv.email}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
                  {inv.role}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-neutral-500">
                {new Date(inv.expiresAt).toLocaleString("ja-JP")}
              </td>
              <td className="space-x-2 px-4 py-3 text-right">
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg border border-neutral-300 bg-neutral-0 px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy === inv.id}
                  onClick={() => resend(inv.id)}
                >
                  再送
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg border border-danger-border bg-neutral-0 px-2.5 py-1 text-xs font-medium text-danger shadow-sm transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy === inv.id}
                  onClick={() => revoke(inv.id)}
                >
                  失効
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
