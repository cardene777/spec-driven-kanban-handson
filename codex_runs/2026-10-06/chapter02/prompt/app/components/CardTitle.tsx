"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CardTitle({ id, title }: { id: string; title: string }) {
 const [editing, setEditing] = useState(false), [draft, setDraft] = useState(title), [error, setError] = useState("");
 const router = useRouter();
 return <div className="rounded bg-white p-3">{editing ? <input autoFocus aria-label="カードタイトル" className="w-full rounded border p-1" value={draft} onChange={e => setDraft(e.target.value)} onBlur={async () => {
 setEditing(false); setError("");
 try {
 const response = await fetch(`/api/cards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft }) });
 const data = await response.json();
 if (!response.ok) { setDraft(title); setError(data.error.message); return; }
 setDraft(data.title); router.refresh();
 } catch { setDraft(title); setError("保存に失敗しました"); }
 }} /> : <button className="w-full text-left" onClick={() => {setDraft(title);setEditing(true);setError("");}}>{title}</button>}
 {error && <p role="alert" className="text-red-700">{error}</p>}</div>;
}
