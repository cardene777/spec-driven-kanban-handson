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
    <div className="rounded border border-gray-200 bg-white">
      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2">名前</th>
            <th className="px-4 py-2">メール</th>
            <th className="px-4 py-2">ロール</th>
            <th className="px-4 py-2">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            return (
              <tr key={m.userId}>
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2 text-gray-600">{m.email}</td>
                <td className="px-4 py-2">
                  {isOwner ? (
                    <select
                      className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                      value={m.role}
                      disabled={busy === m.userId}
                      onChange={(e) => changeRole(m.userId, e.target.value)}
                    >
                      <option value="owner">owner</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span>{m.role}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isOwner || isSelf ? (
                    <button
                      type="button"
                      className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
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
