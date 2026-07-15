// design/012_member_invite.md § 主要 Client Component > InviteCreateForm
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

type Fields = Partial<Record<"email" | "role", string>>;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10";

export default function InviteCreateForm({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  return (
    <form
      className="rounded-2xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm"
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
      <h3 className="text-base font-semibold text-neutral-900">新規招待を作成</h3>
      <p className="mt-1 text-xs text-neutral-500">
        招待 URL は作成時に 1 度だけ表示されます。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-neutral-700">
            メールアドレス
          </label>
          <input
            type="email"
            className={inputClass}
            placeholder="invite@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-neutral-700">
            ロール
          </label>
          <select
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "viewer")}
          >
            <option value="member">member</option>
            <option value="viewer">viewer</option>
          </select>
          {fieldErrors.role ? (
            <p className="mt-1 text-xs text-danger">{fieldErrors.role}</p>
          ) : null}
        </div>
        <div className="flex items-end sm:col-span-1">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "作成中..." : "招待作成"}
          </button>
        </div>
      </div>
      {inviteUrl ? (
        <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <p className="mb-1 text-xs font-medium text-primary-800">
            招待 URL (1 度だけ表示):
          </p>
          <code className="block break-all rounded bg-neutral-0 px-2 py-1.5 text-xs text-neutral-800">
            {inviteUrl}
          </code>
        </div>
      ) : null}
    </form>
  );
}
