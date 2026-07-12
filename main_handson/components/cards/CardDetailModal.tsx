"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import CardComments from "@/components/cards/CardComments";

type Card = {
  id: string;
  listId: string;
  title: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export default function CardDetailModal({ cardId }: { cardId: string }) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <p>読み込み中...</p>
        ) : status === 404 ? (
          <div>
            <p className="text-red-600">カードが見つかりません</p>
            <button
              onClick={close}
              className="mt-4 rounded border border-gray-300 px-4 py-2"
            >
              閉じる
            </button>
          </div>
        ) : card ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              {error?.title ? (
                <p className="text-xs text-red-600">{error.title}</p>
              ) : null}
            </div>
            <div>
              <label className="text-xs text-gray-500">説明文</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-32 w-full whitespace-pre-wrap rounded border border-gray-300 px-3 py-2"
              />
              {error?.description ? (
                <p className="text-xs text-red-600">{error.description}</p>
              ) : null}
            </div>
            <div className="text-xs text-gray-500">
              作成: {card.createdAt} / 更新: {card.updatedAt}
            </div>
            {error?._ ? (
              <p className="text-sm text-red-600">{error._}</p>
            ) : null}
            <div className="flex justify-between">
              <button
                onClick={remove}
                className="rounded border border-red-300 px-4 py-2 text-red-600"
              >
                削除
              </button>
              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="rounded border border-gray-300 px-4 py-2"
                >
                  閉じる
                </button>
                <button
                  onClick={save}
                  className="rounded bg-black px-4 py-2 text-white"
                >
                  保存
                </button>
              </div>
            </div>
            <CardComments cardId={cardId} />
          </div>
        ) : (
          <p>エラー: {status}</p>
        )}
      </div>
    </div>
  );
}
