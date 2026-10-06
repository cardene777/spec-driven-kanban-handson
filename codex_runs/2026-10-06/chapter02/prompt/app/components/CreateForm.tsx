"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CreateForm({ label, url }: { label: string; url: string }) {
 const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
 const router = useRouter();
 return <div className="p-3">{!open ? <button onClick={() => setOpen(true)} className="rounded bg-blue-700 px-4 py-2 text-white">{label}</button> : <form onSubmit={async event => {
 event.preventDefault(); setBusy(true); setError("");
 try {
 const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
 const data = await response.json();
 if (!response.ok) { setError(data.error.message); return; }
 setTitle(""); setOpen(false); router.refresh();
 } catch { setError("保存に失敗しました"); } finally { setBusy(false); }
 }}>
 <label>タイトル<input aria-label="タイトル" className="block rounded border p-2 text-black" value={title} onChange={e => setTitle(e.target.value)} /></label>
 <button disabled={busy} className="mt-2 rounded bg-blue-700 px-3 py-2 text-white">作成</button>
 <button type="button" onClick={() => {setOpen(false); setError("");}} className="m-2">キャンセル</button>
 {error && <p role="alert" className="text-red-700">{error}</p>}
 </form>}</div>;
}
