from pathlib import Path
p=Path('prompt')
def write(n,s):
 f=p/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
write('app/api/cards/[id]/route.ts','''import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
 const { id } = await context.params;
 if (!await prisma.card.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "カードがありません");
 const title = titleOf(await jsonBody(request), 200);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜200文字で入力してください");
 return Response.json(await prisma.card.update({ where: { id }, data: { title } }));
}
''')
write('app/components/CardTitle.tsx','''"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CardTitle({ id, title }: { id: string; title: string }) {
 const [editing, setEditing] = useState(false), [draft, setDraft] = useState(title), [error, setError] = useState("");
 const router = useRouter();
 return <div className="rounded bg-white p-3">{editing ? <input autoFocus aria-label="カードタイトル" className="w-full rounded border p-1" value={draft} onChange={e => setDraft(e.target.value)} onBlur={async () => {
 setEditing(false); setError("");
 try {
 const response = await fetch(`/api/cards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft }) });
 const data = await response.json();
 if (!response.ok) { setDraft(title); setError(data.error.message); return; }
 setDraft(data.title); router.refresh();
 } catch { setDraft(title); setError("保存に失敗しました"); }
 }} /> : <button className="w-full text-left" onClick={() => {setDraft(title);setEditing(true);setError("");}}>{title}</button>}
 {error && <p role="alert" className="text-red-700">{error}</p>}</div>;
}
''')
f=p/'app/boards/[id]/page.tsx';s=f.read_text().replace('export const dynamic', 'import CardTitle from "@/app/components/CardTitle";\nexport const dynamic').replace('<div key={card.id} className="rounded bg-white p-3">{card.title}</div>', '<CardTitle key={card.id} id={card.id} title={card.title} />');f.write_text(s)
write('tests/card-edit.test.ts','''import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/cards/[id]/route";
beforeEach(async () => { await prisma.card.deleteMany(); await prisma.list.deleteMany(); await prisma.board.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (title: string) => new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title }) });
test("欠損カード404優先", async () => {const r=await PATCH(req(""),context("missing"));expect(r.status).toBe(404);expect((await r.json()).error.code).toBe("NOT_FOUND");});
test("編集成功、trim、空と201文字では以前の値保持", async () => {
 const b=await prisma.board.create({data:{title:"B"}});const l=await prisma.list.create({data:{title:"L",order:0,boardId:b.id}});const c=await prisma.card.create({data:{title:"要件を確認",order:0,listId:l.id}});
 const r=await PATCH(req("　要件を再確認 \\t\\n"),context(c.id));expect(r.status).toBe(200);expect((await r.json()).title).toBe("要件を再確認");
 for (const title of ["", "a".repeat(201)]) {const r=await PATCH(req(title),context(c.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe("VALIDATION_ERROR");expect((await prisma.card.findUniqueOrThrow({where:{id:c.id}})).title).toBe("要件を再確認");}
});
''')
with Path('evidence/session.md').open('a') as f:f.write('\nステップ3完了を確認してからステップ4 inputs/prompt-4.md 全文適用。PATCH・blur保存・エラー時保持・テストを新規生成。\n')
