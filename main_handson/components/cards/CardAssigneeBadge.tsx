"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// design/009_assignee.md § 主要 Client Component > CardAssigneeBadge
// 割当済みユーザー 1 名分のバッジ。member 以上には解除導線 (バッジ横のアイコン) を表示。
export default function CardAssigneeBadge({
  cardId,
  userId,
  name,
  canManage,
  onRemoved,
  onError,
}: {
  cardId: string;
  userId: string;
  name: string;
  canManage: boolean;
  onRemoved: () => void;
  onError: (message: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const initial = name.trim().slice(0, 1) || "?";

  async function remove() {
    setSubmitting(true);
    const res = await apiFetch(`/api/cards/${cardId}/assignees/${userId}`, {
      method: "DELETE",
    });
    setSubmitting(false);
    if (res.status === 204) {
      onRemoved();
      return;
    }
    // 404 = 他ユーザーが同時に解除 → 再取得で最新状態に整合 (spec § 画面レベル)
    if (res.status === 404) {
      onRemoved();
      return;
    }
    if (res.status === 403) {
      onError("操作権限がありません");
      return;
    }
    onError(`error_${res.status}`);
  }

  return (
    <Badge variant="secondary" className="gap-1.5 py-1 pr-1 pl-1">
      <Avatar size="sm">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <span className="max-w-32 truncate">{name}</span>
      {canManage ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`${name} の担当を解除`}
          disabled={submitting}
          onClick={remove}
        >
          <X />
        </Button>
      ) : null}
    </Badge>
  );
}
