"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewBoardForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        新規ボード作成
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="ボードのタイトル"
        className="flex-1 rounded-md border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        作成
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-gray-300 px-4 py-2"
      >
        キャンセル
      </button>
    </form>
  );
}
