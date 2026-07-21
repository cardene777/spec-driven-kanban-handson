"use client";

// spec/012_member_invite.md § 画面（招待受け入れ）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function accept() {
    setError(null);
    setPending(true);
    const res = await fetch(`/api/invites/token/${token}/accept`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "参加できませんでした");
      return;
    }
    router.push(`/boards/${body.boardId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button onClick={accept} disabled={pending}>
        参加する
      </Button>
    </div>
  );
}
