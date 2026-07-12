// design/012_member_invite.md § 主要 Client Component > InviteCreateForm
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

type Fields = Partial<Record<"email" | "role", string>>;

export default function InviteCreateForm({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  return (
    <form
      className="rounded border border-gray-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setFieldErrors({});
        setInviteUrl(null);
        try {
          const res = await apiFetch(`/api/boards/${boardId}/invites`, {
            method: "POST",
            body: JSON.stringify({ email, role }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 201) {
            setInviteUrl(data.url);
            setEmail("");
            router.refresh();
            return;
          }
          if (res.status === 422) {
            setFieldErrors(data.fields ?? {});
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-sm font-semibold">新規招待を作成</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div>
          <label className="block text-xs">メールアドレス</label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div>
          <label className="block text-xs">ロール</label>
          <select
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "viewer")}
          >
            <option value="member">member</option>
            <option value="viewer">viewer</option>
          </select>
          {fieldErrors.role ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>
          ) : null}
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {busy ? "作成中..." : "招待作成"}
          </button>
        </div>
      </div>
      {inviteUrl ? (
        <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs">
          <p className="mb-1 text-blue-800">招待 URL (1 度だけ表示):</p>
          <code className="break-all">{inviteUrl}</code>
        </div>
      ) : null}
    </form>
  );
}
