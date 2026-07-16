"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import { apiFetch } from "@/lib/client/apiFetch";
import { canManageAssignees } from "@/lib/assignees/permission";
import CardAssigneeBadge from "@/components/cards/CardAssigneeBadge";
import CardAssigneeAddForm from "@/components/cards/CardAssigneeAddForm";
import { Label } from "@/components/ui/label";

type Candidate = { userId: string; name: string };
type Assignee = { cardId: string; userId: string; createdAt: string };

// design/009_assignee.md § 主要 Client Component > CardAssigneesField
// 担当者領域全体。一覧描画 (バッジ列)、追加導線、解除導線。領域内で fetch / mutation state を持つ。
export default function CardAssigneesField({
  cardId,
  currentUserRole,
  candidates,
}: {
  cardId: string;
  currentUserRole: Role;
  candidates: Candidate[];
}) {
  const [items, setItems] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageAssignees(currentUserRole);

  const load = useCallback(async () => {
    setError(null);
    const res = await apiFetch(`/api/cards/${cardId}/assignees`);
    if (res.status === 200) {
      const data = (await res.json()) as { items: Assignee[] };
      setItems(data.items);
    } else {
      setError("担当者候補を取得できませんでした。 再試行してください");
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/cards/${cardId}/assignees`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 200) {
          const data = (await res.json()) as { items: Assignee[] };
          setItems(data.items);
        } else {
          setError("担当者候補を取得できませんでした。 再試行してください");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const nameOf = (userId: string) =>
    candidates.find((c) => c.userId === userId)?.name ?? "（無効な担当者）";

  // 割当済みユーザーは候補から除外する
  const assignedIds = new Set(items.map((i) => i.userId));
  const remaining = candidates.filter((c) => !assignedIds.has(c.userId));

  return (
    <section className="space-y-2" aria-label="担当者">
      <Label>担当者</Label>
      {loading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">未割当</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {items.map((item) => (
                <CardAssigneeBadge
                  key={item.userId}
                  cardId={cardId}
                  userId={item.userId}
                  name={nameOf(item.userId)}
                  canManage={canManage}
                  onRemoved={load}
                  onError={setError}
                />
              ))}
            </div>
          )}
          {canManage ? (
            <CardAssigneeAddForm
              cardId={cardId}
              candidates={remaining}
              onAdded={load}
            />
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </>
      )}
    </section>
  );
}
