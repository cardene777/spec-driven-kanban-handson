"use client";
// FR-EDIT-001: 失敗したdraftで保存済みタイトルを上書きしない。
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function EditTitle({ id, title }: { id: string; title: string }) {
 const router = useRouter();
 const [editing, setEditing] = useState(false), [draft, setDraft] = useState(title), [message, setMessage] = useState("");
 return <div className="rounded border border-slate-200 bg-white p-3">
 {editing ? <input autoFocus aria-label="カードタイトル" className="entry" value={draft} onChange={event => setDraft(event.target.value)} onBlur={async () => {
 setEditing(false);setMessage("");
 try {
 const result = await fetch(`/api/cards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft }) });
 const data = await result.json();
 if (!result.ok) {setDraft(title);setMessage(data.error.message);return;}
 setDraft(data.title);router.refresh();
 } catch {setDraft(title);setMessage("保存に失敗しました");}
 }} /> : <button className="w-full text-left" onClick={() => {setDraft(title);setMessage("");setEditing(true);}}>{title}</button>}
 {message && <p role="alert" className="text-red-700">{message}</p>}
 </div>;
}
