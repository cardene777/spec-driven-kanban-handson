"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CardItem({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  async function save() {
    setEditing(false);
    await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });
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
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded-md bg-white p-2 text-sm shadow-sm"
    >
      {title}
    </div>
  );
}
