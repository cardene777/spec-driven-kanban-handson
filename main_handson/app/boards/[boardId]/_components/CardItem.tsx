"use client";

// spec/003 / 005 / 006 / 007: カード詳細モーダル（タイトル・説明・ラベル・期限）
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import LabelChip from "./LabelChip";
import LabelPicker from "./LabelPicker";
import DueDateField from "./DueDateField";
import DueDateBadge from "./DueDateBadge";

type CardLabel = { id: string; name: string; color: string };
type Card = {
  id: string;
  title: string;
  description: string;
  dueDate?: string | Date | null;
  labels?: CardLabel[];
};

export default function CardItem({
  card,
  boardLabels = [],
}: {
  card: Card;
  boardLabels?: CardLabel[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const labels = card.labels ?? [];
  const dueDate = card.dueDate ?? null;

  async function save() {
    setError(null);
    const patch: { title?: string; description?: string } = {};
    if (title !== card.title) patch.title = title;
    if (description !== card.description) patch.description = description;
    if (Object.keys(patch).length === 0) {
      setOpen(false);
      return;
    }
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "更新に失敗しました");
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  async function archive() {
    setError(null);
    const res = await fetch(`/api/cards/${card.id}/archive`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "アーカイブに失敗しました");
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!confirm("このカードをゴミ箱へ移動します。よろしいですか？")) return;
    const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "削除に失敗しました");
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-lg border border-border bg-card p-2 text-left text-sm shadow-xs hover:border-primary/50"
      >
        {labels.length > 0 && (
          <span className="mb-1 flex flex-wrap gap-1">
            {labels.map((l) => (
              <LabelChip key={l.id} label={l} />
            ))}
          </span>
        )}
        <span className="block text-card-foreground">{card.title}</span>
        {dueDate && (
          <span className="mt-1 block">
            <DueDateBadge dueDate={dueDate} />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">カード詳細</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`card-title-${card.id}`}>タイトル</Label>
              <Input
                id={`card-title-${card.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`card-desc-${card.id}`}>説明</Label>
              <Textarea
                id={`card-desc-${card.id}`}
                className="h-28"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Separator />
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">ラベル</p>
              <LabelPicker cardId={card.id} boardLabels={boardLabels} assigned={labels} />
            </div>

            <Separator />
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">期限</p>
              <DueDateField cardId={card.id} dueDate={dueDate} />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={archive}>
                アーカイブ
              </Button>
              <Button variant="destructive" onClick={remove}>
                削除（ゴミ箱へ）
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={save}>保存</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
