"use client";
// FR-BOARD-002, FR-LIST-002, FR-CARD-002, FR-COM-002
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CreateForm({ url, label }: { url: string; label: string }) {
 const router = useRouter();
 const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
 if (!open) return <button className="action" onClick={() => setOpen(true)}>{label}</button>;
 return <form className="space-y-2" onSubmit={async event => {
 event.preventDefault(); setPending(true); setMessage("");
 try {
 const result = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
 const data = await result.json();
 if (!result.ok) { setMessage(data.error.message); return; }
 setTitle("");setOpen(false);router.refresh();
 } catch { setMessage("保存に失敗しました"); } finally { setPending(false); }
 }}>
 <label className="block">タイトル<input aria-label="タイトル" className="entry" value={title} onChange={event => setTitle(event.target.value)} /></label>
 <button className="action" disabled={pending}>作成</button>
 <button className="ml-3" type="button" onClick={() => {setOpen(false);setMessage("");}}>キャンセル</button>
 {message && <p role="alert" className="text-red-700">{message}</p>}
 </form>;
}
