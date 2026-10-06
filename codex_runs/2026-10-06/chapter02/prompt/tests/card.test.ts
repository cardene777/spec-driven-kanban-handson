import { beforeEach, afterAll, expect, test } from "vitest";
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
