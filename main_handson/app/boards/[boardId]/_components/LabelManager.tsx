"use client";

// design/005_008_ui_features_ui.md § Organism: LabelManager / spec/006
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import LabelForm from "./LabelForm";
import LabelChip from "./LabelChip";

type Label = { id: string; name: string; color: string };

export default function LabelManager({
  boardId,
  boardLabels,
}: {
  boardId: string;
  boardLabels: Label[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function remove(labelId: string) {
    if (!confirm("このラベルを削除します。付与済みも解除されます。")) return;
    await fetch(`/api/labels/${labelId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <Button variant="outline" onClick={() => setOpen((o) => !o)}>
        {open ? "ラベル管理を閉じる" : "ラベル管理"}
      </Button>
      {open && (
        <Card className="mt-3">
          <CardContent className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">ラベルを追加</h3>
              <LabelForm boardId={boardId} />
            </div>
            <Separator />
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                ラベル一覧（{boardLabels.length}）
              </h3>
              {boardLabels.length === 0 ? (
                <p className="text-xs text-muted-foreground">まだラベルがありません</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {boardLabels.map((l) => (
                    <li key={l.id} className="flex flex-col gap-2 border-b border-border pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <LabelChip label={l} />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setEditing(editing === l.id ? null : l.id)}
                          >
                            編集
                          </Button>
                          <Button variant="destructive" size="xs" onClick={() => remove(l.id)}>
                            削除
                          </Button>
                        </div>
                      </div>
                      {editing === l.id && (
                        <LabelForm boardId={boardId} label={l} onDone={() => setEditing(null)} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
