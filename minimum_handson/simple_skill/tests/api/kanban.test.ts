import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Prisma を実 DB ではなくインメモリのモックに差し替え、
// API ハンドラの入出力・判定順序（404→400）・order 採番だけを検証する。

type Board = { id: string; title: string; createdAt: Date };
type List = { id: string; title: string; order: number; boardId: string; createdAt: Date };
type Card = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  listId: string;
  createdAt: Date;
};

const boards: Board[] = [];
const lists: List[] = [];
const cards: Card[] = [];

let nextId = 1;
const genId = () => `id_${nextId++}`;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    board: {
      findMany: async () =>
        [...boards].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        boards.find((b) => b.id === id) ?? null,
      create: async ({ data }: { data: { title: string } }) => {
        const board: Board = { id: genId(), title: data.title, createdAt: new Date() };
        boards.push(board);
        return board;
      },
    },
    list: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { boardId: string };
        orderBy: { order: "asc" | "desc" };
      }) => {
        const rows = lists.filter((l) => l.boardId === where.boardId);
        const dir = orderBy.order === "asc" ? 1 : -1;
        return rows.sort((a, b) => (a.order - b.order) * dir);
      },
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: { boardId: string };
        orderBy: { order: "desc" };
      }) => {
        const rows = lists
          .filter((l) => l.boardId === where.boardId)
          .sort((a, b) => b.order - a.order);
        void orderBy;
        return rows[0] ?? null;
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        lists.find((l) => l.id === id) ?? null,
      create: async ({
        data,
      }: {
        data: { boardId: string; title: string; order: number };
      }) => {
        const list: List = {
          id: genId(),
          title: data.title,
          order: data.order,
          boardId: data.boardId,
          createdAt: new Date(),
        };
        lists.push(list);
        return list;
      },
    },
    card: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { listId: string };
        orderBy: { order: "asc" | "desc" };
      }) => {
        const rows = cards.filter((c) => c.listId === where.listId);
        const dir = orderBy.order === "asc" ? 1 : -1;
        return rows.sort((a, b) => (a.order - b.order) * dir);
      },
      findFirst: async ({
        where,
      }: {
        where: { listId: string };
        orderBy: { order: "desc" };
      }) => {
        const rows = cards
          .filter((c) => c.listId === where.listId)
          .sort((a, b) => b.order - a.order);
        return rows[0] ?? null;
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        cards.find((c) => c.id === id) ?? null,
      create: async ({
        data,
      }: {
        data: { listId: string; title: string; order: number };
      }) => {
        const card: Card = {
          id: genId(),
          title: data.title,
          description: null,
          order: data.order,
          listId: data.listId,
          createdAt: new Date(),
        };
        cards.push(card);
        return card;
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: { title: string };
      }) => {
        const card = cards.find((c) => c.id === id);
        if (!card) throw new Error("not found");
        card.title = data.title;
        return card;
      },
    },
  },
}));

// vi.mock は evaluate 時に呼ばれるので、これらのハンドラは mock 適用後にimportする
let boardsPOST: typeof import("@/app/api/boards/route").POST;
let listsPOST: typeof import("@/app/api/boards/[id]/lists/route").POST;
let listsGET: typeof import("@/app/api/boards/[id]/lists/route").GET;
let cardsPOST: typeof import("@/app/api/lists/[id]/cards/route").POST;
let cardsGET: typeof import("@/app/api/lists/[id]/cards/route").GET;
let cardPATCH: typeof import("@/app/api/cards/[id]/route").PATCH;

beforeAll(async () => {
  boardsPOST = (await import("@/app/api/boards/route")).POST;
  ({ POST: listsPOST, GET: listsGET } = await import("@/app/api/boards/[id]/lists/route"));
  ({ POST: cardsPOST, GET: cardsGET } = await import("@/app/api/lists/[id]/cards/route"));
  ({ PATCH: cardPATCH } = await import("@/app/api/cards/[id]/route"));
});

afterEach(() => {
  boards.length = 0;
  lists.length = 0;
  cards.length = 0;
  nextId = 1;
});

function jsonReq(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}
function bareReq(url: string) {
  return new Request(url) as unknown as import("next/server").NextRequest;
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function createBoard(title = "Board A") {
  const res = await boardsPOST(jsonReq("http://localhost/api/boards", { title }));
  return res.json();
}
async function createList(boardId: string, title = "List") {
  const res = await listsPOST(
    jsonReq(`http://localhost/api/boards/${boardId}/lists`, { title }),
    ctx(boardId),
  );
  return res.json();
}
async function createCard(listId: string, title = "Card") {
  const res = await cardsPOST(
    jsonReq(`http://localhost/api/lists/${listId}/cards`, { title }),
    ctx(listId),
  );
  return res.json();
}

describe("card create (POST /api/lists/[id]/cards)", () => {
  it("正常な作成は 201 で order=0 から連番になる", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c1 = await createCard(list.id, "A");
    const c2 = await createCard(list.id, "B");
    expect(c1.order).toBe(0);
    expect(c2.order).toBe(1);
    const listAfter = await cardsGET(
      bareReq(`http://localhost/api/lists/${list.id}/cards`),
      ctx(list.id),
    );
    const arr = await listAfter.json();
    expect(arr.map((c: { title: string }) => c.title)).toEqual(["A", "B"]);
  });

  it("空タイトルは 400 でカードが追加されない", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const res = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "   " }),
      ctx(list.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(cards.length).toBe(0);
  });

  it("201 文字のタイトルは 400 でカードが追加されない", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const res = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "a".repeat(201) }),
      ctx(list.id),
    );
    expect(res.status).toBe(400);
    expect(cards.length).toBe(0);
  });

  it("存在しない list への作成は 404 を優先し、body の title は評価しない", async () => {
    const res = await cardsPOST(
      jsonReq(`http://localhost/api/lists/no-such/cards`, { title: "a".repeat(201) }),
      ctx("no-such"),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("存在しない board への list 一覧取得は 404", async () => {
    const res = await listsGET(
      bareReq(`http://localhost/api/boards/no-such/lists`),
      ctx("no-such"),
    );
    expect(res.status).toBe(404);
  });
});

describe("card edit (PATCH /api/cards/[id])", () => {
  it("正常な編集は 200 で保存される", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, "before");
    const res = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, { title: "after" }, "PATCH"),
      ctx(card.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("after");
  });

  it("空タイトル・201 文字は 400 で保存されない", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, "before");
    for (const bad of ["   ", "a".repeat(201)]) {
      const res = await cardPATCH(
        jsonReq(`http://localhost/api/cards/${card.id}`, { title: bad }, "PATCH"),
        ctx(card.id),
      );
      expect(res.status).toBe(400);
    }
    const found = cards.find((c) => c.id === card.id);
    expect(found?.title).toBe("before");
  });

  it("存在しない card への PATCH は 404（body 検証より優先）", async () => {
    const res = await cardPATCH(
      jsonReq(`http://localhost/api/cards/no-such`, { title: "a".repeat(201) }, "PATCH"),
      ctx("no-such"),
    );
    expect(res.status).toBe(404);
  });
});

describe("list order (POST /api/boards/[id]/lists)", () => {
  it("同一 board 内で order は 0 から連番になる", async () => {
    const board = await createBoard();
    const a = await createList(board.id, "A");
    const b = await createList(board.id, "B");
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
  });
});
