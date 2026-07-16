// design/010_comment.md § UI 構造 SSOT
// spec/010_comment.md § FR-02 / FR-03 / FR-04 の一覧表示・投稿・削除
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div>
      <h3 className="mb-2 text-sm font-medium text-foreground">コメント</h3>
      <div className="mb-3 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを入力"
          className="h-20 whitespace-pre-wrap text-sm"
        />
        <div className="flex items-center justify-between">
          {postError ? (
            <p className="text-xs text-destructive">{postError}</p>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={submitting}
          >
            投稿
          </Button>
        </div>
      </div>
      {loadError ? (
        <p className="text-sm text-destructive">
          コメントの取得に失敗しました ({loadError})
        </p>
      ) : items === null ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだコメントはありません</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-border p-2 text-sm"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {c.authorId} / {c.createdAt}
                </span>
                {c.authorId === CURRENT_USER_ID ? (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="h-auto p-0 text-destructive"
                    onClick={() => remove(c.id)}
                  >
                    削除
                  </Button>
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
