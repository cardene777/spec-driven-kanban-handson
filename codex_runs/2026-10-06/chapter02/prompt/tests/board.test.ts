import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/boards/route";
beforeEach(async () => { await prisma.card.deleteMany(); await prisma.list.deleteMany(); await prisma.board.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); });
const request = (title: string) => new Request("http://localhost/api/boards", { method: "POST", body: JSON.stringify({ title }) });
test("正常作成、トリム、表示", async () => {
 const r = await POST(request(" 　会社プロジェクト\t\n")); expect(r.status).toBe(201); expect((await r.json()).title).toBe("会社プロジェクト");
 expect((await (await GET()).json()).map((b: { title: string }) => b.title)).toEqual(["会社プロジェクト"]);
});
test.each(["", "a".repeat(101)])("不正タイトルは追加しない", async title => {
 const r = await POST(request(title)); expect(r.status).toBe(400); expect((await r.json()).error.code).toBe("VALIDATION_ERROR"); expect(await prisma.board.count()).toBe(0);
});
