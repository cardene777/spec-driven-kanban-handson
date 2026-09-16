"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CardItem({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const response = await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });
    setEditing(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? "更新に失敗しました");
      setValue(title);
      return;
    }
    setError(null);
    router.refresh();
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        className="w-full rounded-md border border-blue-400 p-2 text-sm"
      />
    );
  }

  return (
    <div className="rounded-md bg-white p-2 text-sm shadow-sm">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setEditing(true);
        }}
        className="w-full cursor-pointer text-left"
      >
        {title}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
