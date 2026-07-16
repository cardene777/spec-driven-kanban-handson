"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Candidate = { userId: string; name: string };

// spec/009_assignee.md § 異常系 § 画面レベル: POST の 409 / 422 / 403 別メッセージ
function messageFor(status: number, field?: string): string {
  if (status === 409) return "このユーザーは既に担当者に設定されています";
  if (status === 403) return "操作権限がありません";
  if (status === 422 && field === "assignees_limit_exceeded")
    return "担当者は最大 10 名までです";
  if (status === 422 && field === "assignee_not_in_board")
    return "このユーザーはボードメンバーではありません";
  if (status === 422) return "担当者を追加できませんでした";
  return `error_${status}`;
}

// design/009_assignee.md § 主要 Client Component > CardAssigneeAddForm
// 候補ユーザーを選択して POST /api/cards/{cardId}/assignees を叩く。
export default function CardAssigneeAddForm({
  cardId,
  candidates,
  onAdded,
}: {
  cardId: string;
  candidates: Candidate[];
  onAdded: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function add(userId: string) {
    setError(null);
    setSubmitting(true);
    const res = await apiFetch(`/api/cards/${cardId}/assignees`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    setSubmitting(false);
    if (res.status === 201) {
      onAdded();
      return;
    }
    let field: string | undefined;
    if (res.status === 409 || res.status === 422) {
      const body = (await res.json().catch(() => ({}))) as {
        fields?: Record<string, string>;
      };
      field = body.fields?.userId;
    }
    setError(messageFor(res.status, field));
  }

  return (
    <div className="space-y-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" size="sm" disabled={submitting}>
              <UserPlus />
              担当者を追加する
            </Button>
          }
        />
        <DropdownMenuContent>
          {candidates.length === 0 ? (
            <DropdownMenuItem disabled>候補がいません</DropdownMenuItem>
          ) : (
            candidates.map((c) => (
              <DropdownMenuItem key={c.userId} onClick={() => add(c.userId)}>
                {c.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
