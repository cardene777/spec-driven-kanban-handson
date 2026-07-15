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

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">読み込み中...</div>
        ) : status === 404 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-danger">カードが見つかりません</p>
            <button
              onClick={close}
              className="mt-6 inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-neutral-0 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              閉じる
            </button>
          </div>
        ) : card ? (
          <>
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 10h8M8 14h5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  カード詳細
                </div>
              </div>
              <button
                onClick={close}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
                aria-label="閉じる"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`mt-1.5 ${inputClass}`}
                />
                {error?.title ? (
                  <p className="mt-1 text-xs text-danger">{error.title}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  説明文
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="カードの詳細を入力"
                  className={`mt-1.5 h-32 whitespace-pre-wrap ${inputClass}`}
                />
                {error?.description ? (
                  <p className="mt-1 text-xs text-danger">{error.description}</p>
                ) : null}
              </div>

              <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                作成: {new Date(card.createdAt).toLocaleString("ja-JP")}
                <br />
                更新: {new Date(card.updatedAt).toLocaleString("ja-JP")}
              </div>

              {error?._ ? (
                <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error._}
                </div>
              ) : null}

              <CardComments cardId={cardId} />
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-4">
              <button
                onClick={remove}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger-border bg-neutral-0 px-4 py-2 text-sm font-medium text-danger shadow-sm transition-colors hover:bg-danger-soft"
              >
                削除
              </button>
              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-neutral-0 px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
                >
                  閉じる
                </button>
                <button
                  onClick={save}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                >
                  保存
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-danger">エラー: {status}</div>
        )}
      </div>
    </div>
  );
}
