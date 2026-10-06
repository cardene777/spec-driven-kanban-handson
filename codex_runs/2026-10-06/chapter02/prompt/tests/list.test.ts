import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/boards/[id]/lists/route";
beforeEach(async () => { await prisma.card.deleteMany(); await prisma.list.deleteMany(); await prisma.board.deleteMany(); });
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
