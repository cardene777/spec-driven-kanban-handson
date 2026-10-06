import Kanban from "@/components/Kanban";
import AppShell from "@/components/layout/AppShell";
export default async function Page({params}:{params:Promise<{boardId:string}>}){const {boardId}=await params;return <AppShell activeBoardId={boardId}><Kanban boardId={boardId}/></AppShell>;}
