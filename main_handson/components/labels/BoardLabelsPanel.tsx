"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/apiFetch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import LabelBadge from "@/components/labels/LabelBadge";
import { LABEL_COLORS, type Label, type LabelColor } from "@/lib/labels/colors";

// design/006_label.md § UI 構造 > BoardLabelsPanel + LabelColorPicker
// ボード単位のラベル管理 (右 drawer)。作成 / 編集 / 削除。

function ColorPicker({
  value,
  onChange,
}: {
  value: LabelColor;
  onChange: (c: LabelColor) => void;
}) {
  return (
    <div role="radiogroup" aria-label="ラベル色" className="flex flex-wrap gap-1.5">
      {LABEL_COLORS.map((c) => (
        <Button
          key={c}
          type="button"
          variant="outline"
          size="icon-sm"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          className={value === c ? "ring-2 ring-ring" : undefined}
          style={{ backgroundColor: `var(--label-${c}-bg)` }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function LabelRow({
  label,
  onChanged,
}: {
  label: Label;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState<LabelColor>(label.color);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/labels/${label.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, color }),
    });
    setBusy(false);
    if (res.status === 200) {
      setEditing(false);
      onChanged();
      return;
    }
    if (res.status === 422) {
      const body = (await res.json()) as { fields?: Record<string, string> };
      setError(body.fields?.name ?? body.fields?.color ?? "invalid");
      return;
    }
    setError(`error_${res.status}`);
  }

  async function remove() {
    if (!window.confirm(`ラベル「${label.name}」 を削除します。 よろしいですか?`)) return;
    setBusy(true);
    const res = await apiFetch(`/api/labels/${label.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.status === 204) {
      onChanged();
      return;
    }
    setError(`error_${res.status}`);
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border border-border p-2">
        <Input
          type="text"
          aria-label="ラベル名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8"
        />
        <ColorPicker value={color} onChange={setColor} />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" size="xs" disabled={busy} onClick={save}>
            保存
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setName(label.name);
              setColor(label.color);
              setError(null);
            }}
          >
            キャンセル
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
      <LabelBadge name={label.name} color={label.color} />
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={busy}
          onClick={() => setEditing(true)}
        >
          編集
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-destructive"
          disabled={busy}
          onClick={remove}
        >
          削除
        </Button>
      </div>
    </div>
  );
}

export default function BoardLabelsPanel({
  boardId,
  initialLabels,
  canManage,
}: {
  boardId: string;
  initialLabels: Label[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("gray");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await apiFetch(`/api/boards/${boardId}/labels`);
    if (res.status === 200) {
      const data = (await res.json()) as { items: Label[] };
      setLabels(data.items);
    }
    router.refresh();
  }

  async function create() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/boards/${boardId}/labels`, {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
    setBusy(false);
    if (res.status === 201) {
      setName("");
      setColor("gray");
      await reload();
      return;
    }
    if (res.status === 422) {
      const body = (await res.json()) as { fields?: Record<string, string> };
      setError(body.fields?.name ?? body.fields?.color ?? "invalid");
      return;
    }
    setError(`error_${res.status}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        ラベルを管理
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-sm">
        <SheetHeader className="p-0">
          <SheetTitle>ラベル管理</SheetTitle>
          <SheetDescription>
            このボードのラベルを作成・編集・削除します。
          </SheetDescription>
        </SheetHeader>

        {canManage ? (
          <div className="space-y-2">
            <FieldLabel htmlFor="new-label-name">新規ラベル</FieldLabel>
            <Input
              id="new-label-name"
              type="text"
              placeholder="ラベル名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
            <ColorPicker value={color} onChange={setColor} />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button type="button" size="sm" disabled={busy} onClick={create}>
              作成
            </Button>
          </div>
        ) : null}

        <Separator />

        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだラベルがありません。
          </p>
        ) : (
          <div className="space-y-2">
            {labels.map((l) => (
              <LabelRow key={l.id} label={l} onChanged={reload} />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
