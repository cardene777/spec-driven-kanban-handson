import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/cards/[id]/route";
beforeEach(async () => { await prisma.card.deleteMany(); await prisma.list.deleteMany(); await prisma.board.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (title: string) => new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ title }) });
test("欠損カード404優先", async () => {const r=await PATCH(req(""),context("missing"));expect(r.status).toBe(404);expect((await r.json()).error.code).toBe("NOT_FOUND");});
test("編集成功、trim、空と201文字では以前の値保持", async () => {
 const b=await prisma.board.create({data:{title:"B"}});const l=await prisma.list.create({data:{title:"L",order:0,boardId:b.id}});const c=await prisma.card.create({data:{title:"要件を確認",order:0,listId:l.id}});
 const r=await PATCH(req("　要件を再確認 \t\n"),context(c.id));expect(r.status).toBe(200);expect((await r.json()).title).toBe("要件を再確認");
 for (const title of ["", "a".repeat(201)]) {const r=await PATCH(req(title),context(c.id));expect(r.status).toBe(400);expect((await r.json()).error.code).toBe("VALIDATION_ERROR");expect((await prisma.card.findUniqueOrThrow({where:{id:c.id}})).title).toBe("要件を再確認");}
});
