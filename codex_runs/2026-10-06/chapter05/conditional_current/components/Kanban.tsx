"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/components/ui/dialog";
type Item = {id:string;title:string;description?:string;order:number};
export default function Kanban({boardId}:{boardId?:string}) {
 const [boards,setBoards]=useState<Item[]>([]),[lists,setLists]=useState<Item[]>([]),[cards,setCards]=useState<Record<string,Item[]>>({});
 const [error,setError]=useState(""),[loading,setLoading]=useState(true),[selected,setSelected]=useState<Item|null>(null);
 const [title,setTitle]=useState(""),[description,setDescription]=useState("");

 const call=useCallback(async (path:string,method="GET",body?:unknown) => {
  const response=await fetch(path,{method,headers:{"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok) { const data=await response.json(); throw new Error(data.error+ (data.fields?" "+JSON.stringify(data.fields):"")); }
  return response.status===204?null:response.json();
 },[]);
 const load=useCallback(async()=>{
  const b=await call("/api/boards");setBoards(b.items);
  if(boardId){ await call(`/api/boards/${boardId}`); const l=await call(`/api/boards/${boardId}/lists`);setLists(l.items);
   const entries=await Promise.all(l.items.map(async (row:Item)=>[row.id,(await call(`/api/lists/${row.id}/cards`)).items])); setCards(Object.fromEntries(entries)); }
  setLoading(false);
 },[boardId,call]);
 useEffect(()=>{ load().catch(e=>{setError(e.message);setLoading(false);}); },[load]);
 async function mutate(path:string,method:string,body?:unknown){setError("");try{await call(path,method,body);await load();return true;}catch(e){setError((e as Error).message);return false;}}
 function form(path:string,label:string){return <form onSubmit={async e=>{e.preventDefault();const f=e.currentTarget;const value=new FormData(f).get("title");if(await mutate(path,"POST",{title:value}))f.reset();}}><label>{label}<Input name="title" aria-label={label} required /></label><Button type="submit">作成</Button></form>;}
 function rename(kind:string,row:Item){const value=prompt("新しい題名",row.title);if(value!==null)void mutate(`/api/${kind}/${row.id}`,"PATCH",{title:value});}
 function remove(kind:string,row:Item){if(confirm("削除しますか？"))void mutate(`/api/${kind}/${row.id}`,"DELETE");}
 function order(kind:string,row:Item,delta:number){void mutate(`/api/${kind}/${row.id}`,"PATCH",{targetOrder:row.order+delta});}
 function open(card:Item){setSelected(card);setTitle(card.title);setDescription(card.description??"");}
 return <main><h1>{boardId?boards.find(b=>b.id===boardId)?.title:"Simple Kanban"}</h1>{error&&<p role="alert">{error}</p>}{loading?<p>読み込み中</p>:!boardId?<>
 {form("/api/boards","新規ボード名")}{boards.length===0&&<p>ボードがありません</p>}{boards.map(b=><section key={b.id}><Link href={`/boards/${b.id}`}>{b.title}</Link><Button onClick={()=>rename("boards",b)}>ボード名編集</Button><Button onClick={()=>remove("boards",b)}>ボード削除</Button></section>)}</>:<>
 <Link href="/">ボード一覧</Link>{form(`/api/boards/${boardId}/lists`,"新規リスト名")}{lists.length===0&&<p>リストがありません</p>}<div className="columns">{lists.map(l=><section key={l.id} className="list"><h2>{l.title}</h2><Button onClick={()=>rename("lists",l)}>リスト名編集</Button><Button onClick={()=>remove("lists",l)}>リスト削除</Button><Button disabled={l.order===0} onClick={()=>order("lists",l,-1)}>リスト前へ</Button><Button disabled={l.order===lists.length-1} onClick={()=>order("lists",l,1)}>リスト後へ</Button>{form(`/api/lists/${l.id}/cards`,"新規カード名")}{!cards[l.id]?.length&&<p>カードがありません</p>}{cards[l.id]?.map(c=><article key={c.id}><Button onClick={()=>open(c)}>{c.title}</Button><Button onClick={()=>remove("cards",c)}>カード削除</Button><Button disabled={c.order===0} onClick={()=>order("cards",c,-1)}>カード上へ</Button><Button disabled={c.order===(cards[l.id]?.length??0)-1} onClick={()=>order("cards",c,1)}>カード下へ</Button></article>)}</section>)}</div></>}
 <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent><DialogHeader><DialogTitle className="font-heading">カード詳細</DialogTitle><DialogDescription>題名と説明を編集できます。</DialogDescription></DialogHeader><form onSubmit={async e=>{e.preventDefault();if(selected&&await mutate(`/api/cards/${selected.id}`,"PATCH",{title,description})){setSelected(null);}}}><label>題名<Input aria-label="題名" value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>説明<Textarea aria-label="説明" value={description} onChange={e=>setDescription(e.target.value)}/></label><DialogFooter><Button type="submit">保存</Button><Button type="button" variant="secondary" onClick={()=>setSelected(null)}>閉じる</Button></DialogFooter></form></DialogContent></Dialog>
 </main>;
}
