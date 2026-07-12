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
      <p className="text-xs text-gray-500">
        pending の招待はありません。
      </p>
    );
  }
  return (
    <div className="rounded border border-gray-200 bg-white">
      {message ? (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800 break-all">
          {message}
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2">メール</th>
            <th className="px-4 py-2">ロール</th>
            <th className="px-4 py-2">有効期限</th>
            <th className="px-4 py-2">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invites.map((inv) => (
            <tr key={inv.id}>
              <td className="px-4 py-2">{inv.email}</td>
              <td className="px-4 py-2">{inv.role}</td>
              <td className="px-4 py-2 text-xs text-gray-600">
                {inv.expiresAt}
              </td>
              <td className="px-4 py-2 space-x-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                  disabled={busy === inv.id}
                  onClick={() => resend(inv.id)}
                >
                  再送
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
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
