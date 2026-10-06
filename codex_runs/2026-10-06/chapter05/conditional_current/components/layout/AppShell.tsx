"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Avatar,AvatarFallback} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
export default function AppShell({children,activeBoardId}:{children:React.ReactNode;activeBoardId?:string}){
 const [boards,setBoards]=useState<{id:string;title:string}[]>([]);
 useEffect(()=>{fetch("/api/boards").then(r=>r.json()).then(data=>setBoards(data.items??[]));},[]);
 const active=boards.find(b=>b.id===activeBoardId);
 return <div className="app-shell"><aside><Link className="brand" href="/">Simple Kanban</Link><nav aria-label="ナビゲーション"><Link href="/">ボード一覧</Link></nav><h2>最近のボード</h2><nav aria-label="最近のボード">{boards.map(b=><Link key={b.id} href={`/boards/${b.id}`}>{b.title}</Link>)}</nav><div className="user-info"><Avatar><AvatarFallback>ロ</AvatarFallback></Avatar><span>ローカル利用者</span></div></aside><div className="workspace"><header><nav aria-label="パンくず"><Link href="/">ボード一覧</Link>{active&&<span> / {active.title}</span>}</nav><div className="header-user"><Button aria-label="通知" variant="ghost" disabled>通知</Button><Avatar><AvatarFallback>ロ</AvatarFallback></Avatar></div></header>{children}</div></div>;
}
