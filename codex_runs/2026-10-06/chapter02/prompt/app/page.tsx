import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateForm from "./components/CreateForm";
export const dynamic = "force-dynamic";
export default async function Home() {
 const boards = await prisma.board.findMany({ orderBy: { createdAt: "desc" } });
 return <main className="p-8"><h1 className="text-2xl font-bold">カンバン一覧</h1><div className="mt-6 flex flex-wrap gap-4">{boards.map(board => <Link className="rounded border p-6" key={board.id} href={`/boards/${board.id}`}>{board.title}</Link>)}<CreateForm label="新規ボード作成" url="/api/boards" /></div></main>;
}
