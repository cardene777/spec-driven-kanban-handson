"use client";

import { useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import { Check, Plus } from "lucide-react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Label as FieldLabel } from "@/components/ui/label";
import LabelBadge from "@/components/labels/LabelBadge";
import type { Label } from "@/lib/labels/colors";

// design/006_label.md § UI 構造 > CardLabelsField
// カード詳細モーダルのラベル領域。付与済みバッジ + 全ラベルのトグル (楽観的更新)。
export default function CardLabelsField({
  cardId,
  boardLabels,
  currentUserRole,
}: {
  cardId: string;
  boardLabels: Label[];
  currentUserRole: Role;
}) {
  const canManage = currentUserRole !== "viewer";
  const [attached, setAttached] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/cards/${cardId}/labels`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 200) {
          const data = (await res.json()) as { items: Label[] };
          setAttached(new Set(data.items.map((l) => l.id)));
        } else {
          setError("ラベルを取得できませんでした。 再試行してください");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  async function toggle(labelId: string, next: boolean) {
    setError(null);
    // 楽観的更新
    setAttached((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(labelId);
      else copy.delete(labelId);
      return copy;
    });
    const res = await apiFetch(`/api/cards/${cardId}/labels/${labelId}`, {
      method: next ? "POST" : "DELETE",
    });
    if (res.status === 204) return;
    // 失敗時ロールバック (spec/006_label.md § 画面レベル)
    setAttached((prev) => {
      const copy = new Set(prev);
      if (next) copy.delete(labelId);
      else copy.add(labelId);
      return copy;
    });
    setError(res.status === 403 ? "操作権限がありません" : `error_${res.status}`);
  }

  const attachedLabels = boardLabels.filter((l) => attached.has(l.id));

  return (
    <section className="space-y-2" aria-label="ラベル">
      <FieldLabel>ラベル</FieldLabel>
      {loading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : (
        <>
          {attachedLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">ラベルなし</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {attachedLabels.map((l) => (
                <LabelBadge key={l.id} name={l.name} color={l.color} />
              ))}
            </div>
          )}

          {canManage ? (
            boardLabels.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                このボードにはまだラベルがありません
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {boardLabels.map((l) => {
                  const isOn = attached.has(l.id);
                  return (
                    <Button
                      key={l.id}
                      type="button"
                      variant="outline"
                      size="xs"
                      aria-pressed={isOn}
                      onClick={() => toggle(l.id, !isOn)}
                    >
                      {isOn ? <Check /> : <Plus />}
                      <LabelBadge name={l.name} color={l.color} />
                    </Button>
                  );
                })}
              </div>
            )
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </>
      )}
    </section>
  );
}
