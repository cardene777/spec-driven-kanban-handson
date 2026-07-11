"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  cardId: string;
  initialTitle: string;
};

export default function CardTitle({ cardId, initialTitle }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = async () => {
    const trimmed = title.trim();

    if (!trimmed) {
      setError("タイトルを入力してください");
      setTitle(initialTitle);
      setIsEditing(false);
      return;
    }

    if (trimmed === initialTitle) {
      setError(null);
      setIsEditing(false);
      return;
    }

    setError(null);
    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "カードの更新に失敗しました");
      setTitle(initialTitle);
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    startTransition(() => router.refresh());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setTitle(initialTitle);
      setError(null);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full cursor-text text-left text-sm font-medium text-zinc-900 hover:text-zinc-600"
        >
          {initialTitle}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-900 disabled:opacity-50"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
