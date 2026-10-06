// FR-BOARD-001, FR-BOARD-002, FR-COM-003
import Link from "next/link";
import { db } from "@/lib/db";
import CreateForm from "./components/create-form";
export const dynamic = "force-dynamic";
export default async function Home() {
 const boards = await db.board.findMany({ orderBy: { createdAt: "desc" } });
 return <main className="mx-auto max-w-5xl p-8"><h1 className="mb-6 text-3xl font-bold">カンバン一覧</h1>
 <div className="flex flex-wrap items-start gap-4">{boards.map(board => <Link key={board.id} href={`/boards/${board.id}`} className="rounded border bg-white p-6 shadow-sm">{board.title}</Link>)}<CreateForm label="新規ボード作成" url="/api/boards" /></div></main>;
}
