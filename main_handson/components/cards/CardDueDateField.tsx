"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CardDueDateBadge from "@/components/cards/CardDueDateBadge";

// design/007_due_date.md § UI 構造 > CardDueDateField
// カード詳細モーダルの期限領域。現在の期限表示 + 設定 / 変更 / 解除 (楽観的更新)。
export default function CardDueDateField({
  cardId,
  initialDueDate,
  currentUserRole,
}: {
  cardId: string;
  initialDueDate: string | null;
  currentUserRole: Role;
}) {
  const canManage = currentUserRole !== "viewer";
  const [dueDate, setDueDate] = useState<string | null>(initialDueDate);
  const [draft, setDraft] = useState<string>(initialDueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(next: string | null) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const prev = dueDate;
    setDueDate(next); // 楽観的更新
    const res = await apiFetch(`/api/cards/${cardId}/due-date`, {
      method: "PATCH",
      body: JSON.stringify({ dueDate: next }),
    });
    setSubmitting(false);
    if (res.status === 200) {
      const data = (await res.json()) as { dueDate: string | null };
      setDueDate(data.dueDate);
      setDraft(data.dueDate ?? "");
      return;
    }
    // 失敗時ロールバック (spec/007_due_date.md § 画面レベル)
    setDueDate(prev);
    setDraft(prev ?? "");
    if (res.status === 422) {
      const body = (await res.json()) as { fields?: Record<string, string> };
      setError(body.fields?.dueDate ?? body.fields?._ ?? "invalid");
      return;
    }
    setError(`error_${res.status}`);
  }

  return (
    <section className="space-y-2" aria-label="期限">
      <Label>期限</Label>
      <div className="flex flex-wrap items-center gap-2">
        {dueDate ? (
          <CardDueDateBadge dueDate={dueDate} />
        ) : (
          <span className="text-sm text-muted-foreground">期限なし</span>
        )}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="期限日"
            value={draft}
            disabled={submitting}
            onChange={(e) => setDraft(e.target.value)}
            className="w-40"
          />
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => submit(draft === "" ? null : draft)}
          >
            {dueDate ? "変更" : "設定"}
          </Button>
          {dueDate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => submit(null)}
            >
              期限を解除
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
