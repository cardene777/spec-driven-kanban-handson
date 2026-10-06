from pathlib import Path
p=Path('prompt')
def write(n,s):
 f=p/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
f=p/'prisma/schema.prisma';s=f.read_text().replace('model Board {','model Board {\n lists List[]');s+='''model List {
 id String @id @default(cuid())
 title String
 order Int
 boardId String
 createdAt DateTime @default(now())
 board Board @relation(fields: [boardId], references: [id])
}
''';f.write_text(s)
write('app/api/boards/[id]/lists/route.ts','''import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.board.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "ボードがありません");
 return Response.json(await prisma.list.findMany({ where: { boardId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.board.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "ボードがありません");
 const title = titleOf(await jsonBody(request), 100);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜100文字で入力してください");
 const max = await prisma.list.aggregate({ where: { boardId: id }, _max: { order: true } });
 return Response.json(await prisma.list.create({ data: { boardId: id, title, order: (max._max.order ?? -1) + 1 } }), { status: 201 });
}
''')
write('app/boards/[id]/page.tsx','''import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateForm from "@/app/components/CreateForm";
export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const board = await prisma.board.findUnique({ where: { id }, include: { lists: { orderBy: { order: "asc" } } } });
 if (!board) notFound();
 return <main className="p-8"><Link href="/">一覧へ</Link><h1 className="my-4 text-2xl font-bold">{board.title}</h1>
 <div className="flex items-start gap-4 overflow-x-auto">{board.lists.map(list => <section key={list.id} className="w-72 shrink-0 rounded bg-slate-200 p-4"><h2 className="font-bold">{list.title}</h2></section>)}
 <CreateForm label="リスト作成" url={`/api/boards/${id}/lists`} /></div></main>;
}
''')
write('tests/list.test.ts','''import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/boards/[id]/lists/route";
beforeEach(async () => { await prisma.list.deleteMany(); await prisma.board.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (title: string) => new Request("http://localhost", { method: "POST", body: JSON.stringify({ title }) });
test("欠損Board GETとPOSTは404を優先", async () => {
 for (const r of [await GET(req(""),context("missing")),await POST(req(""),context("missing"))]) { expect(r.status).toBe(404);expect((await r.json()).error.code).toBe("NOT_FOUND"); }
});
test("リスト作成、親関係、並び順、不正入力", async () => {
 const b = await prisma.board.create({data:{title:"B"}});
 for (const title of ["ToDo","進行中","Done"]) expect((await POST(req(title),context(b.id))).status).toBe(201);
 const lists = await (await GET(req(""),context(b.id))).json();expect(lists.map((l:{order:number})=>l.order)).toEqual([0,1,2]);
 for (const title of ["", "a".repeat(101)]) {const r=await POST(req(title),context(b.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe("VALIDATION_ERROR");}
 expect(await prisma.list.count()).toBe(3);
});
''')
f=p/'tests/board.test.ts';f.write_text(f.read_text().replace('await prisma.board.deleteMany();','await prisma.list.deleteMany(); await prisma.board.deleteMany();'))
with Path('evidence/session.md').open('a') as f:f.write('\nステップ1完了: lint/typecheck/test/build終了0。Playwrightで作成・空/101文字エラー・追加なし・reload・詳細クリックを確認。ステップ2 inputs/prompt-2.md 全文適用。リストモデル・API・横並び画面・テストを新規生成。\n')
