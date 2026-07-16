// design/012_member_invite.md § 主要 Client Component > InviteCreateForm
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Fields = Partial<Record<"email" | "role", string>>;

// 置換対象 15 component に <select> は含まれないため、native のまま token 由来 class で見た目だけ統一する。
const selectClass =
  "mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function InviteCreateForm({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  return (
    <form
      className="rounded-lg border border-border bg-card p-4"
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
          <Label className="text-xs" htmlFor="invite-email">
            メールアドレス
          </Label>
          <Input
            id="invite-email"
            type="email"
            className="mt-1 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div>
          <Label className="text-xs" htmlFor="invite-role">
            ロール
          </Label>
          <select
            id="invite-role"
            className={selectClass}
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "viewer")}
          >
            <option value="member">member</option>
            <option value="viewer">viewer</option>
          </select>
          {fieldErrors.role ? (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.role}</p>
          ) : null}
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "作成中..." : "招待作成"}
          </Button>
        </div>
      </div>
      {inviteUrl ? (
        <div className="mt-3 rounded-md border border-border bg-accent/40 p-2 text-xs">
          <p className="mb-1 text-accent-foreground">招待 URL (1 度だけ表示):</p>
          <code className="break-all">{inviteUrl}</code>
        </div>
      ) : null}
    </form>
  );
}
