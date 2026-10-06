// FR-LIST-001, FR-LIST-002, FR-CARD-001, FR-CARD-002, FR-EDIT-001
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CreateForm from "@/app/components/create-form";
import EditTitle from "@/app/components/edit-title";
export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const board = await db.board.findUnique({ where: { id }, include: { lists: { orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } } } });
 if (!board) notFound();
 return <main className="p-8"><Link href="/" className="text-blue-700">一覧へ</Link><h1 className="my-4 text-3xl font-bold">{board.title}</h1>
 <div className="flex items-start gap-5 overflow-x-auto">{board.lists.map(list => <section key={list.id} className="w-72 shrink-0 rounded bg-slate-200 p-4"><h2 className="mb-3 font-bold">{list.title}</h2>
 <div className="mb-4 flex flex-col gap-2">{list.cards.map(card => <EditTitle key={card.id} id={card.id} title={card.title} />)}</div>
 <CreateForm label="カード追加" url={`/api/lists/${list.id}/cards`} /></section>)}<CreateForm label="リスト作成" url={`/api/boards/${id}/lists`} /></div></main>;
}
