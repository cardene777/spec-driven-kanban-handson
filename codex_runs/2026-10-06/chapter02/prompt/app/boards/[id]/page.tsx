import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateForm from "@/app/components/CreateForm";
import CardTitle from "@/app/components/CardTitle";
export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const board = await prisma.board.findUnique({ where: { id }, include: { lists: { orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } } } });
 if (!board) notFound();
 return <main className="p-8"><Link href="/">一覧へ</Link><h1 className="my-4 text-2xl font-bold">{board.title}</h1>
 <div className="flex items-start gap-4 overflow-x-auto">{board.lists.map(list => <section key={list.id} className="w-72 shrink-0 rounded bg-slate-200 p-4"><h2 className="font-bold">{list.title}</h2><div className="my-3 flex flex-col gap-2">{list.cards.map(card => <CardTitle key={card.id} id={card.id} title={card.title} />)}</div><CreateForm label="カード追加" url={`/api/lists/${list.id}/cards`} /></section>)}
 <CreateForm label="リスト作成" url={`/api/boards/${id}/lists`} /></div></main>;
}
