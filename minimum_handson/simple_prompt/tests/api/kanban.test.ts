import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { GET as getLists, POST as createList } from "@/app/api/boards/[id]/lists/route";
import { GET as getCards, POST as createCard } from "@/app/api/lists/[id]/cards/route";
import { PATCH as updateCard } from "@/app/api/cards/[id]/route";

beforeEach(async () => {
  await prisma.card.deleteMany();
  await prisma.list.deleteMany();
  await prisma.board.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function request(url: string, method: "POST" | "PATCH", body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("最小カンバンの異常系", () => {
  it("空のボードタイトルは400で、ボードを追加しない", async () => {
    const { POST } = await import("@/app/api/boards/route");
    const response = await POST(request("http://localhost/api/boards", "POST", { title: "　 \t\n" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.board.count()).toBe(0);
  });

  it("存在しないボードのリスト取得は404を返す", async () => {
    const response = await getLists(new NextRequest("http://localhost/api/boards/missing/lists"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("存在しないリストのカード取得は404を返す", async () => {
    const response = await getCards(new NextRequest("http://localhost/api/lists/missing/cards"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("リストとカードを連番で作成し、201文字のカードは追加しない", async () => {
    const board = await prisma.board.create({ data: { title: "ボード" } });
    const listResponse = await createList(
      request("http://localhost/api/boards/x/lists", "POST", { title: "ToDo" }),
      { params: Promise.resolve({ id: board.id }) },
    );
    expect(listResponse.status).toBe(201);
    const list = await listResponse.json();
    const cardResponse = await createCard(
      request("http://localhost/api/lists/x/cards", "POST", { title: "要件を確認" }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(cardResponse.status).toBe(201);
    const rejected = await createCard(
      request("http://localhost/api/lists/x/cards", "POST", { title: "a".repeat(201) }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(rejected.status).toBe(400);
    expect(await prisma.card.count()).toBe(1);
  });

  it("存在しないカードの更新は404を返す", async () => {
    const response = await updateCard(
      request("http://localhost/api/cards/missing", "PATCH", { title: "更新" }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("空のタイトルでカードを更新しても、保存済みタイトルを変更しない", async () => {
    const board = await prisma.board.create({ data: { title: "ボード" } });
    const list = await prisma.list.create({ data: { title: "ToDo", boardId: board.id, order: 0 } });
    const card = await prisma.card.create({ data: { title: "元のタイトル", listId: list.id, order: 0 } });
    const response = await updateCard(
      request("http://localhost/api/cards/x", "PATCH", { title: " " }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).title).toBe("元のタイトル");
  });
});
