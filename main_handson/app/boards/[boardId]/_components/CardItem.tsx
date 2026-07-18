"use client";

// spec/003_cards.md § カード詳細モーダルの基本構造
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Card = {
  id: string;
  title: string;
  description: string;
};

export default function CardItem({ card }: { card: Card }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  async function remove() {
    if (!confirm("このカードを削除します。よろしいですか？")) return;
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
        className="block w-full rounded border border-slate-200 bg-white p-2 text-left text-sm shadow-sm hover:border-slate-400"
      >
        {card.title}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-slate-500">
              カード詳細
            </h3>
            <label className="block text-xs text-slate-600">タイトル</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label className="mt-4 block text-xs text-slate-600">説明</label>
            <textarea
              className="mt-1 h-32 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={remove}
                className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                削除
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
