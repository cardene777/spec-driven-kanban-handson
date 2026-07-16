"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import { apiFetch } from "@/lib/client/apiFetch";
import CardComments from "@/components/cards/CardComments";
import CardAssigneesField from "@/components/cards/CardAssigneesField";
import CardDueDateField from "@/components/cards/CardDueDateField";
import CardLabelsField from "@/components/labels/CardLabelsField";
import type { Label as BoardLabel } from "@/lib/labels/colors";
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

type Card = {
  id: string;
  listId: string;
  title: string;
  description: string;
  order: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function CardDetailModal({
  cardId,
  currentUserRole,
  assigneeCandidates,
  boardLabels,
}: {
  cardId: string;
  currentUserRole: Role;
  assigneeCandidates: { userId: string; name: string }[];
  boardLabels: BoardLabel[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(`/api/cards/${cardId}`)
      .then(async (res) => {
        if (cancelled) return;
        setStatus(res.status);
        if (res.status === 200) {
          const data = (await res.json()) as Card;
          setCard(data);
          setTitle(data.title);
          setDescription(data.description);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  function close() {
    const params = new URLSearchParams(searchParams);
    params.delete("card");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function save() {
    if (!card) return;
    const body: { title?: string; description?: string } = {};
    if (title !== card.title) body.title = title;
    if (description !== card.description) body.description = description;
    if (Object.keys(body).length === 0) {
      close();
      return;
    }
    const res = await apiFetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (res.status === 200) {
      router.refresh();
      close();
      return;
    }
    if (res.status === 422) {
      const errBody = (await res.json()) as { fields?: Record<string, string> };
      setError(errBody.fields ?? {});
      return;
    }
    setError({ _: `error_${res.status}` });
  }

  async function remove() {
    if (!window.confirm("このカードを削除します。 よろしいですか?")) return;
    const res = await apiFetch(`/api/cards/${cardId}`, { method: "DELETE" });
    if (res.status === 204) {
      router.refresh();
      close();
    } else {
      setError({ _: `error_${res.status}` });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>カード詳細</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : status === 404 ? (
          <>
            <p className="text-sm text-destructive">カードが見つかりません</p>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                閉じる
              </Button>
            </DialogFooter>
          </>
        ) : card ? (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="card-title">タイトル</Label>
                <Input
                  id="card-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {error?.title ? (
                  <p className="text-xs text-destructive">{error.title}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-description">説明文</Label>
                <Textarea
                  id="card-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-32 whitespace-pre-wrap"
                />
                {error?.description ? (
                  <p className="text-xs text-destructive">{error.description}</p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                作成: {card.createdAt} / 更新: {card.updatedAt}
              </p>
              {error?._ ? (
                <p className="text-sm text-destructive">{error._}</p>
              ) : null}

              <Separator />

              <CardLabelsField
                cardId={cardId}
                boardLabels={boardLabels}
                currentUserRole={currentUserRole}
              />

              <Separator />

              <CardDueDateField
                cardId={cardId}
                initialDueDate={card.dueDate}
                currentUserRole={currentUserRole}
              />

              <Separator />

              <CardAssigneesField
                cardId={cardId}
                currentUserRole={currentUserRole}
                candidates={assigneeCandidates}
              />

              <Separator />

              <CardComments cardId={cardId} />
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="destructive" onClick={remove}>
                削除
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={close}>
                  閉じる
                </Button>
                <Button onClick={save}>保存</Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <p className="text-sm text-destructive">エラー: {status}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
