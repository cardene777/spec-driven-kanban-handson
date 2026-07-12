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
    <div className="border-t border-gray-200 pt-4">
      <h3 className="mb-2 text-sm font-medium text-gray-700">コメント</h3>
      <div className="mb-3 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを入力"
          className="h-20 w-full whitespace-pre-wrap rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between">
          {postError ? (
            <p className="text-xs text-red-600">{postError}</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            投稿
          </button>
        </div>
      </div>
      {loadError ? (
        <p className="text-sm text-red-600">
          コメントの取得に失敗しました ({loadError})
        </p>
      ) : items === null ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">まだコメントはありません</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded border border-gray-200 p-2 text-sm"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {c.authorId} / {c.createdAt}
                </span>
                {c.authorId === CURRENT_USER_ID ? (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="text-red-600 hover:underline"
                  >
                    削除
                  </button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
