"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
type Item = {id:string;title:string;order:number;description?:string};
async function api(path:string,method="GET",data?:unknown) {
 const res=await fetch(path,{method,headers:{"content-type":"application/json"},body:data ? JSON.stringify(data):undefined});
 if (!res.ok) {const error=await res.json(); throw new Error(JSON.stringify(error));}
 return res.status===204 ? null : res.json();
}
export function Kanban({boardId}:{boardId?:string}) {
 const router=useRouter();
 const [boards,setBoards]=useState<Item[]>([]),[board,setBoard]=useState<Item|null>(null),[lists,setLists]=useState<Item[]>([]),[cards,setCards]=useState<Record<string,Item[]>>({});
 const [error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[selected,setSelected]=useState<Item|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),origin=useRef<HTMLElement|null>(null);
 async function load() {
  if (!boardId) setBoards((await api("/api/boards")).items);
  else {
   setBoard(await api(`/api/boards/${boardId}`));const items=(await api(`/api/boards/${boardId}/lists`)).items as Item[];setLists(items);
   const entries=await Promise.all(items.map(async l=>[l.id,(await api(`/api/lists/${l.id}/cards`)).items] as const));setCards(Object.fromEntries(entries));
  }
 }
 useEffect(()=>{Promise.resolve().then(load).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[boardId]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(selected) dialog.current?.showModal();},[selected]);
 async function act(action:()=>Promise<unknown>) {setBusy(true);setError("");try {await action();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function close(){dialog.current?.close();setSelected(null);origin.current?.focus();}
 function create(path:string,label:string){return <form onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const title=new FormData(f).get("title");void act(async()=>{await api(path,"POST",{title});f.reset();});}}><label>{label}<input name="title" required maxLength={path.includes("cards")?200:100}/></label><button disabled={busy}>作成</button></form>;}
 function rename(path:string,item:Item){const title=window.prompt("新しい題名",item.title);if(title!==null)void act(()=>api(path,"PATCH",{title}));}
 function controls(kind:string,item:Item,count:number){return <><button disabled={busy} onClick={()=>rename(`/api/${kind}/${item.id}`,item)}>名前編集</button><button disabled={busy} onClick={()=>{if(confirm("削除しますか？"))void act(async()=>{await api(`/api/${kind}/${item.id}`,"DELETE");if(kind==="boards"&&boardId)router.push("/");});}}>削除</button>{kind!=="boards"&&<><button aria-label={`${item.title}を前へ`} disabled={busy||item.order===0} onClick={()=>void act(()=>api(`/api/${kind}/${item.id}`,"PATCH",{order:item.order-1}))}>↑</button><button aria-label={`${item.title}を後へ`} disabled={busy||item.order===count-1} onClick={()=>void act(()=>api(`/api/${kind}/${item.id}`,"PATCH",{order:item.order+1}))}>↓</button></>}</>;}
 return <main><h1>Simple Kanban</h1>{error&&<p role="alert" className="error">{error}</p>}{loading?<p role="status">読み込み中</p>:!boardId?<><h2>ボード一覧</h2>{create("/api/boards","新規ボード名")}{boards.length===0&&<p>ボードはありません</p>}{boards.map(b=><section key={b.id}><Link href={`/boards/${b.id}`}>{b.title}</Link>{controls("boards",b,boards.length)}</section>)}</>:<><Link href="/">ボード一覧へ</Link><h2>{board?.title}</h2>{board&&controls("boards",board,1)}{create(`/api/boards/${boardId}/lists`,"新規リスト名")}{lists.length===0&&<p>リストはありません</p>}<div className="columns">{lists.map(l=><section key={l.id}><h2>{l.title}</h2>{controls("lists",l,lists.length)}{create(`/api/lists/${l.id}/cards`,"新規カード名")}{cards[l.id]?.length===0&&<p>カードはありません</p>}{cards[l.id]?.map(c=><div key={c.id}><button disabled={busy} onClick={e=>{origin.current=e.currentTarget;setSelected(c);}}>{c.title}</button>{controls("cards",c,cards[l.id].length)}</div>)}</section>)}</div></>}
 <dialog ref={dialog} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="card-dialog-title">{selected&&<form key={selected.id} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void act(async()=>{await api(`/api/cards/${selected.id}`,"PATCH",{title:f.get("title"),description:f.get("description")});close();});}}><h2 id="card-dialog-title">カード詳細</h2><label>題名<input name="title" defaultValue={selected.title} required maxLength={200} autoFocus/></label><label>説明<textarea name="description" defaultValue={selected.description} maxLength={2000}/></label><button disabled={busy}>保存</button><button type="button" onClick={close}>閉じる</button></form>}</dialog>
 </main>;
}
