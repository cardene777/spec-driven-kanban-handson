from pathlib import Path
p=Path('prompt')
def write(n,s):
 f=p/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
f=p/'prisma/schema.prisma';s=f.read_text().replace('model List {','model List {\n cards Card[]');s+='''model Card {
 id String @id @default(cuid())
 title String
 description String?
 order Int
 listId String
 createdAt DateTime @default(now())
 list List @relation(fields: [listId], references: [id])
}
''';f.write_text(s)
write('app/api/lists/[id]/cards/route.ts','''import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.list.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "リストがありません");
 return Response.json(await prisma.card.findMany({ where: { listId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, context: Context) {
 const { id } = await context.params;
 if (!await prisma.list.findUnique({ where: { id } })) return error(404, "NOT_FOUND", "リストがありません");
 const body = await jsonBody(request), title = titleOf(body, 200);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜200文字で入力してください");
 const description = body && typeof body === "object" && "description" in body && typeof body.description === "string" ? body.description : null;
 const max = await prisma.card.aggregate({ where: { listId: id }, _max: { order: true } });
 return Response.json(await prisma.card.create({ data: { listId: id, title, description, order: (max._max.order ?? -1) + 1 } }), { status: 201 });
}
''')
f=p/'app/boards/[id]/page.tsx';s=f.read_text().replace('lists: { orderBy: { order: "asc" } }','lists: { orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } }');s=s.replace('{list.title}</h2></section>', '{list.title}</h2><div className="my-3 flex flex-col gap-2">{list.cards.map(card => <div key={card.id} className="rounded bg-white p-3">{card.title}</div>)}</div><CreateForm label="カード追加" url={`/api/lists/${list.id}/cards`} /></section>');f.write_text(s)
write('tests/card.test.ts','''import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/lists/[id]/cards/route";
beforeEach(async () => { await prisma.card.deleteMany(); await prisma.list.deleteMany(); await prisma.board.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (title: string) => new Request("http://localhost", { method: "POST", body: JSON.stringify({ title }) });
test("欠損List GETとPOSTは404を優先", async () => {
 for (const r of [await GET(req(""),context("missing")),await POST(req(""),context("missing"))]) { expect(r.status).toBe(404);expect((await r.json()).error.code).toBe("NOT_FOUND"); }
});
test("カード作成、null、並び順、不正入力で追加なし", async () => {
 const b = await prisma.board.create({data:{title:"B"}});const l = await prisma.list.create({data:{title:"L",order:0,boardId:b.id}});
 for (const title of ["要件を確認","APIを実装"]) {const r=await POST(req(title),context(l.id));expect(r.status).toBe(201);expect((await r.json()).description).toBeNull();}
 const cards = await (await GET(req(""),context(l.id))).json();expect(cards.map((c:{order:number})=>c.order)).toEqual([0,1]);
 for (const title of ["", "a".repeat(201)]) {const r=await POST(req(title),context(l.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe("VALIDATION_ERROR");}
 expect(await prisma.card.count()).toBe(2);
});
''')
for n in ['board','list']:
 f=p/f'tests/{n}.test.ts';f.write_text(f.read_text().replace('await prisma.list.deleteMany();','await prisma.card.deleteMany(); await prisma.list.deleteMany();'))
with Path('evidence/session.md').open('a') as f:f.write('\nステップ2完了: lint/typecheck/test(5件)/build終了0、実ブラウザの3リスト順番・横並び・空/101文字・404優先が成功。ステップ3 inputs/prompt-3.md 全文適用。Cardと表示・API・テストを生成。\n')
