// API の最低限のテスト（design/001_minimum_kanban.md 実装順序 7）
// カードタイトルの正常系・異常系（空文字 / 201文字）・404優先・order 連番を検証する
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { createBoard } from "@/lib/repository/board";
import { createList } from "@/lib/repository/list";
import { listCardsByList } from "@/lib/repository/card";
import { listListsByBoard } from "@/lib/repository/list";

import { POST as createCardRoute } from "@/app/api/lists/[id]/cards/route";
import { PATCH as patchCardRoute } from "@/app/api/cards/[id]/route";
import { POST as createListRoute } from "@/app/api/boards/[id]/lists/route";

// 各テストの前に全データを消して独立させる
beforeEach(async () => {
  await prisma.card.deleteMany();
  await prisma.list.deleteMany();
  await prisma.board.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function setupList() {
  const board = await createBoard("テストボード");
  const list = await createList(board.id, "テストリスト");
  return { board, list };
}

describe("カード作成 POST /api/lists/[id]/cards", () => {
  it("正常なタイトルで作成できる（201）", async () => {
    const { list } = await setupList();
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "買い物" }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(res.status).toBe(201);
    const cards = await listCardsByList(list.id);
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("買い物");
  });

  it("前後の空白はトリムして保存する", async () => {
    const { list } = await setupList();
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "　 掃除 　" }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(res.status).toBe(201);
    const cards = await listCardsByList(list.id);
    expect(cards[0].title).toBe("掃除");
  });

  it("空文字は 400 で、カードは追加されない", async () => {
    const { list } = await setupList();
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "   " }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(await listCardsByList(list.id)).toHaveLength(0);
  });

  it("201文字は 400 で、カードは追加されない", async () => {
    const { list } = await setupList();
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "a".repeat(201) }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(res.status).toBe(400);
    expect(await listCardsByList(list.id)).toHaveLength(0);
  });

  it("200文字（上限）は作成できる", async () => {
    const { list } = await setupList();
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "a".repeat(200) }),
      { params: Promise.resolve({ id: list.id }) },
    );
    expect(res.status).toBe(201);
    expect(await listCardsByList(list.id)).toHaveLength(1);
  });

  it("存在しないリストへの作成は、不正なタイトルでも 404 を優先する", async () => {
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "" }),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("カードの order はリスト内で 0 から連番になる", async () => {
    const { list } = await setupList();
    for (const t of ["A", "B", "C"]) {
      await createCardRoute(
        jsonRequest("http://localhost/api/lists/x/cards", { title: t }),
        { params: Promise.resolve({ id: list.id }) },
      );
    }
    const cards = await listCardsByList(list.id);
    expect(cards.map((c) => c.order)).toEqual([0, 1, 2]);
    expect(cards.map((c) => c.title)).toEqual(["A", "B", "C"]);
  });
});

describe("カード編集 PATCH /api/cards/[id]", () => {
  async function setupCard() {
    const { list } = await setupList();
    const res = await createCardRoute(
      jsonRequest("http://localhost/api/lists/x/cards", { title: "元のタイトル" }),
      { params: Promise.resolve({ id: list.id }) },
    );
    const card = await res.json();
    return { list, card };
  }

  it("正常なタイトルに更新できる（200）", async () => {
    const { list, card } = await setupCard();
    const res = await patchCardRoute(
      patchRequest("http://localhost/api/cards/x", { title: "新しいタイトル" }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(res.status).toBe(200);
    const cards = await listCardsByList(list.id);
    expect(cards[0].title).toBe("新しいタイトル");
  });

  it("空文字は 400 で、カードは更新されない", async () => {
    const { list, card } = await setupCard();
    const res = await patchCardRoute(
      patchRequest("http://localhost/api/cards/x", { title: "   " }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    const cards = await listCardsByList(list.id);
    expect(cards[0].title).toBe("元のタイトル");
  });

  it("201文字は 400 で、カードは更新されない", async () => {
    const { list, card } = await setupCard();
    const res = await patchCardRoute(
      patchRequest("http://localhost/api/cards/x", { title: "a".repeat(201) }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(res.status).toBe(400);
    const cards = await listCardsByList(list.id);
    expect(cards[0].title).toBe("元のタイトル");
  });

  it("200文字（上限）に更新できる", async () => {
    const { list, card } = await setupCard();
    const res = await patchCardRoute(
      patchRequest("http://localhost/api/cards/x", { title: "a".repeat(200) }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(res.status).toBe(200);
    const cards = await listCardsByList(list.id);
    expect(cards[0].title).toHaveLength(200);
  });

  it("存在しないカードの編集は 404 を返す", async () => {
    const res = await patchCardRoute(
      patchRequest("http://localhost/api/cards/x", { title: "更新" }),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("リスト作成 POST /api/boards/[id]/lists", () => {
  it("リストの order はボード内で 0 から連番になる", async () => {
    const board = await createBoard("ボード");
    for (const t of ["リスト1", "リスト2", "リスト3"]) {
      await createListRoute(
        jsonRequest("http://localhost/api/boards/x/lists", { title: t }),
        { params: Promise.resolve({ id: board.id }) },
      );
    }
    const lists = await listListsByBoard(board.id);
    expect(lists.map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it("存在しないボードへの作成は、不正なタイトルでも 404 を優先する", async () => {
    const res = await createListRoute(
      jsonRequest("http://localhost/api/boards/x/lists", { title: "" }),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
