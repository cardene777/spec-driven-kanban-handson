// design/013_permissions.md § 主要 Client Component > BoardMemberList
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

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

const roleBadgeClass: Record<Member["role"], string> = {
  owner: "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200",
  member: "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200",
  viewer: "bg-neutral-50 text-neutral-500 ring-1 ring-inset ring-neutral-200",
};

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
    if (!confirm("削除しますか?")) return;
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
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-sm">
      {error ? (
        <div className="border-b border-danger-border bg-danger-soft px-4 py-2.5 text-xs text-danger">
          {error}
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
          <tr>
            <th className="px-4 py-3">メンバー</th>
            <th className="px-4 py-3">メール</th>
            <th className="px-4 py-3">ロール</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const initial = m.name.trim().slice(0, 1).toUpperCase() || "U";
            return (
              <tr key={m.userId} className="transition-colors hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {initial}
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900">
                        {m.name}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-neutral-400">(自分)</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{m.email}</td>
                <td className="px-4 py-3">
                  {isOwner ? (
                    <select
                      className="rounded-lg border border-neutral-300 bg-neutral-0 px-2 py-1 text-xs font-medium text-neutral-700 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-50"
                      value={m.role}
                      disabled={busy === m.userId}
                      onChange={(e) => changeRole(m.userId, e.target.value)}
                    >
                      <option value="owner">owner</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass[m.role]}`}>
                      {m.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isOwner || isSelf ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-danger-border bg-neutral-0 px-2.5 py-1 text-xs font-medium text-danger shadow-sm transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy === m.userId}
                      onClick={() => remove(m.userId)}
                    >
                      {isSelf ? "脱退" : "削除"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
