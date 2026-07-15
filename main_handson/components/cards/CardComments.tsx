// design/010_comment.md § UI 構造 SSOT
// spec/010_comment.md § FR-02 / FR-03 / FR-04 の一覧表示・投稿・削除
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";

type Comment = {
  id: string;
  cardId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const CURRENT_USER_ID =
  process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? "user_default";

export default function CardComments({ cardId }: { cardId: string }) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    const res = await apiFetch(`/api/cards/${cardId}/comments`);
    if (res.status === 200) {
      const data = (await res.json()) as { items: Comment[] };
      setItems(data.items);
    } else {
      setLoadError(`error_${res.status}`);
    }
  }, [cardId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch(`/api/cards/${cardId}/comments`);
      if (cancelled) return;
      if (res.status === 200) {
        const data = (await res.json()) as { items: Comment[] };
        setItems(data.items);
      } else {
        setLoadError(`error_${res.status}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  async function submit() {
    if (submitting) return;
    setPostError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/cards/${cardId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      if (res.status === 201) {
        setBody("");
        await reload();
        return;
      }
      if (res.status === 422) {
        const errBody = (await res.json()) as { fields?: Record<string, string> };
        setPostError(errBody.fields?.body ?? "validation_error");
        return;
      }
      setPostError(`error_${res.status}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(commentId: string) {
    if (!window.confirm("このコメントを削除します。 よろしいですか?")) return;
    const res = await apiFetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });
    if (res.status === 204 || res.status === 404) {
      await reload();
    } else {
      setLoadError(`error_${res.status}`);
    }
  }

  return (
    <div className="border-t border-neutral-200 pt-5">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          コメント
        </h3>
        {items ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-xs font-medium text-neutral-600">
            {items.length}
          </span>
        ) : null}
      </div>

      <div className="mb-4 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを入力"
          className="h-20 w-full whitespace-pre-wrap rounded-lg border border-neutral-300 bg-neutral-0 px-3.5 py-2 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
        />
        <div className="flex items-center justify-between">
          {postError ? (
            <p className="text-xs text-danger">{postError}</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !body.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-neutral-0 shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "投稿中..." : "投稿"}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
          コメントの取得に失敗しました ({loadError})
        </div>
      ) : items === null ? (
        <p className="text-sm text-neutral-500">読み込み中...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-6 text-center text-sm text-neutral-400">
          まだコメントはありません
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const initial = c.authorId.slice(0, 1).toUpperCase();
            return (
              <li
                key={c.id}
                className="rounded-lg border border-neutral-200 bg-neutral-0 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {initial}
                    </div>
                    <span className="text-xs font-medium text-neutral-700">
                      {c.authorId}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {new Date(c.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  {c.authorId === CURRENT_USER_ID ? (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      削除
                    </button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-neutral-800">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
