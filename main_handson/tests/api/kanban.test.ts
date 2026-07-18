// spec/001_boards.md / spec/002_lists.md / spec/003_cards.md 受入条件から抜粋
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type User = { id: string; email: string };
type Board = {
  id: string;
  title: string;
  order: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};
type Membership = {
  id: string;
  boardId: string;
  userId: string;
  role: "owner" | "member" | "viewer";
};
type List = {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};
type Card = {
  id: string;
  listId: string;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

const users: User[] = [];
const boards: Board[] = [];
const memberships: Membership[] = [];
const lists: List[] = [];
const cards: Card[] = [];

let seq = 1;
const genId = () => `id_${seq++}`;

let currentUserId: string | null = null;
function setCurrentUser(id: string | null) {
  currentUserId = id;
}

vi.mock("@/lib/auth/currentUser", () => ({
  currentUser: async () => {
    if (currentUserId === null) return null;
    const user = users.find((u) => u.id === currentUserId);
    return user ?? null;
  },
}));

vi.mock("@/lib/audit/log", () => ({
  auditLog: () => {},
}));

vi.mock("@/lib/prisma", () => {
  const prisma: Record<string, unknown> = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return users.find((u) => u.email === where.email) ?? null;
        if (where.id) return users.find((u) => u.id === where.id) ?? null;
        return null;
      },
      create: async ({ data }: { data: { email: string } }) => {
        const user: User = { id: genId(), email: data.email };
        users.push(user);
        return user;
      },
    },
    board: {
      findMany: async ({ where }: { where: { memberships: { some: { userId: string } } } }) => {
        const uid = where.memberships.some.userId;
        const boardIds = new Set(
          memberships.filter((m) => m.userId === uid).map((m) => m.boardId),
        );
        return boards
          .filter((b) => boardIds.has(b.id))
          .sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        boards.find((b) => b.id === id) ?? null,
      findFirst: async ({ where }: { where: { ownerId: string } }) => {
        const rows = boards
          .filter((b) => b.ownerId === where.ownerId)
          .sort((a, b) => b.order - a.order);
        return rows[0] ?? null;
      },
      create: async ({ data }: { data: { title: string; order: number; ownerId: string } }) => {
        const now = new Date();
        const board: Board = {
          id: genId(),
          title: data.title,
          order: data.order,
          ownerId: data.ownerId,
          createdAt: now,
          updatedAt: now,
        };
        boards.push(board);
        return board;
      },
      update: async ({ where, data }: { where: { id: string }; data: { title: string } }) => {
        const board = boards.find((b) => b.id === where.id);
        if (!board) throw new Error("not_found");
        board.title = data.title;
        board.updatedAt = new Date();
        return board;
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        const index = boards.findIndex((b) => b.id === id);
        if (index < 0) throw new Error("not_found");
        const [board] = boards.splice(index, 1);
        const listsToDelete = lists.filter((l) => l.boardId === id).map((l) => l.id);
        for (const lid of listsToDelete) {
          for (let i = cards.length - 1; i >= 0; i--) {
            if (cards[i].listId === lid) cards.splice(i, 1);
          }
        }
        for (let i = lists.length - 1; i >= 0; i--) {
          if (lists[i].boardId === id) lists.splice(i, 1);
        }
        for (let i = memberships.length - 1; i >= 0; i--) {
          if (memberships[i].boardId === id) memberships.splice(i, 1);
        }
        return board;
      },
    },
    boardMembership: {
      findUnique: async ({
        where: { boardId_userId: { boardId, userId } },
      }: {
        where: { boardId_userId: { boardId: string; userId: string } };
      }) => memberships.find((m) => m.boardId === boardId && m.userId === userId) ?? null,
      create: async ({
        data,
      }: {
        data: { boardId: string; userId: string; role: Membership["role"] };
      }) => {
        const row: Membership = { id: genId(), ...data };
        memberships.push(row);
        return row;
      },
    },
    list: {
      findMany: async ({ where }: { where: { boardId: string } }) =>
        lists
          .filter((l) => l.boardId === where.boardId)
          .sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime()),
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        lists.find((l) => l.id === id) ?? null,
      findFirst: async ({ where }: { where: { boardId: string } }) => {
        const rows = lists.filter((l) => l.boardId === where.boardId).sort((a, b) => b.order - a.order);
        return rows[0] ?? null;
      },
      create: async ({ data }: { data: { boardId: string; title: string; order: number } }) => {
        const now = new Date();
        const list: List = {
          id: genId(),
          boardId: data.boardId,
          title: data.title,
          order: data.order,
          createdAt: now,
          updatedAt: now,
        };
        lists.push(list);
        return list;
      },
      update: async ({ where, data }: { where: { id: string }; data: { title: string } }) => {
        const list = lists.find((l) => l.id === where.id);
        if (!list) throw new Error("not_found");
        list.title = data.title;
        list.updatedAt = new Date();
        return list;
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        const index = lists.findIndex((l) => l.id === id);
        if (index < 0) throw new Error("not_found");
        const [list] = lists.splice(index, 1);
        for (let i = cards.length - 1; i >= 0; i--) {
          if (cards[i].listId === id) cards.splice(i, 1);
        }
        return list;
      },
    },
    card: {
      findMany: async ({ where }: { where: { listId: string } }) =>
        cards
          .filter((c) => c.listId === where.listId)
          .sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime()),
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        cards.find((c) => c.id === id) ?? null,
      findFirst: async ({ where }: { where: { listId: string } }) => {
        const rows = cards.filter((c) => c.listId === where.listId).sort((a, b) => b.order - a.order);
        return rows[0] ?? null;
      },
      create: async ({
        data,
      }: {
        data: { listId: string; title: string; description: string; order: number };
      }) => {
        const now = new Date();
        const card: Card = {
          id: genId(),
          listId: data.listId,
          title: data.title,
          description: data.description,
          order: data.order,
          createdAt: now,
          updatedAt: now,
        };
        cards.push(card);
        return card;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { title?: string; description?: string };
      }) => {
        const card = cards.find((c) => c.id === where.id);
        if (!card) throw new Error("not_found");
        if (data.title !== undefined) card.title = data.title;
        if (data.description !== undefined) card.description = data.description;
        card.updatedAt = new Date();
        return card;
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        const index = cards.findIndex((c) => c.id === id);
        if (index < 0) throw new Error("not_found");
        const [card] = cards.splice(index, 1);
        return card;
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  };
  return { prisma };
});

// prisma mock 内で $transaction コールバックに渡す tx は上位の prisma object と同じ関数を参照させたい。
// Vitest の hoist を避けるため、遅延 import。
let boardsGET: typeof import("@/app/api/boards/route").GET;
let boardsPOST: typeof import("@/app/api/boards/route").POST;
let boardGET: typeof import("@/app/api/boards/[boardId]/route").GET;
let boardPATCH: typeof import("@/app/api/boards/[boardId]/route").PATCH;
let boardDELETE: typeof import("@/app/api/boards/[boardId]/route").DELETE;
let listsPOST: typeof import("@/app/api/boards/[boardId]/lists/route").POST;
let listPATCH: typeof import("@/app/api/lists/[listId]/route").PATCH;
let cardsGET: typeof import("@/app/api/lists/[listId]/cards/route").GET;
let cardsPOST: typeof import("@/app/api/lists/[listId]/cards/route").POST;
let cardPATCH: typeof import("@/app/api/cards/[cardId]/route").PATCH;
let cardDELETE: typeof import("@/app/api/cards/[cardId]/route").DELETE;

beforeAll(async () => {
  ({ GET: boardsGET, POST: boardsPOST } = await import("@/app/api/boards/route"));
  ({ GET: boardGET, PATCH: boardPATCH, DELETE: boardDELETE } = await import(
    "@/app/api/boards/[boardId]/route"
  ));
  ({ POST: listsPOST } = await import(
    "@/app/api/boards/[boardId]/lists/route"
  ));
  ({ PATCH: listPATCH } = await import("@/app/api/lists/[listId]/route"));
  ({ GET: cardsGET, POST: cardsPOST } = await import(
    "@/app/api/lists/[listId]/cards/route"
  ));
  ({ PATCH: cardPATCH, DELETE: cardDELETE } = await import("@/app/api/cards/[cardId]/route"));
});

afterEach(() => {
  users.length = 0;
  boards.length = 0;
  memberships.length = 0;
  lists.length = 0;
  cards.length = 0;
  seq = 1;
  currentUserId = null;
});

function jsonReq(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}
function bareReq(url: string, method: "GET" | "DELETE" = "GET") {
  return new Request(url, { method }) as unknown as import("next/server").NextRequest;
}
const boardCtx = (boardId: string) => ({ params: Promise.resolve({ boardId }) });
const listCtx = (listId: string) => ({ params: Promise.resolve({ listId }) });
const cardCtx = (cardId: string) => ({ params: Promise.resolve({ cardId }) });

function loginAs(id: string, email = `${id}@example.com`) {
  if (!users.find((u) => u.id === id)) users.push({ id, email });
  setCurrentUser(id);
}
function addMembership(boardId: string, userId: string, role: Membership["role"]) {
  memberships.push({ id: genId(), boardId, userId, role });
}
async function createBoard(userId: string, title = "Board") {
  loginAs(userId);
  const res = await boardsPOST(jsonReq("http://localhost/api/boards", { title }));
  return res.json() as Promise<Board>;
}

describe("boards", () => {
  it("FR-001/003: owner が作成すると order は 0 から連番、一覧は owner に見える", async () => {
    const a = await createBoard("u1", "A");
    const b = await createBoard("u1", "B");
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    const res = await boardsGET();
    const body = await res.json();
    expect(body.items.map((x: Board) => x.title)).toEqual(["A", "B"]);
  });

  it("FR-006: 未ログインだと 401", async () => {
    setCurrentUser(null);
    const res = await boardsGET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("FR-007: メンバーでないユーザーには 404", async () => {
    const board = await createBoard("u1");
    loginAs("u2");
    const res = await boardGET(bareReq(`http://localhost/api/boards/${board.id}`), boardCtx(board.id));
    expect(res.status).toBe(404);
  });

  it("FR-008: viewer は PATCH で 403", async () => {
    const board = await createBoard("u1");
    loginAs("u2");
    addMembership(board.id, "u2", "viewer");
    const res = await boardPATCH(
      jsonReq(`http://localhost/api/boards/${board.id}`, { title: "X" }, "PATCH"),
      boardCtx(board.id),
    );
    expect(res.status).toBe(403);
  });

  it("FR-009: 空タイトルは 422, 101 文字も 422", async () => {
    loginAs("u1");
    for (const bad of ["   ", "a".repeat(101)]) {
      const res = await boardsPOST(jsonReq("http://localhost/api/boards", { title: bad }));
      expect(res.status).toBe(422);
    }
    expect(boards.length).toBe(0);
  });

  it("FR-005: DELETE すると 204、配下の List/Card も消える", async () => {
    const board = await createBoard("u1");
    const listRes = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "L" }),
      boardCtx(board.id),
    );
    const list = (await listRes.json()) as List;
    await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "C" }),
      listCtx(list.id),
    );
    const res = await boardDELETE(bareReq(`http://localhost/api/boards/${board.id}`, "DELETE"), boardCtx(board.id));
    expect(res.status).toBe(204);
    expect(boards.length).toBe(0);
    expect(lists.length).toBe(0);
    expect(cards.length).toBe(0);
  });
});

describe("lists", () => {
  it("FR-003: member 以上が作成できる、viewer は 403", async () => {
    const board = await createBoard("u1");
    loginAs("u2");
    addMembership(board.id, "u2", "viewer");
    const res403 = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "X" }),
      boardCtx(board.id),
    );
    expect(res403.status).toBe(403);

    loginAs("u3");
    addMembership(board.id, "u3", "member");
    const res201 = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "X" }),
      boardCtx(board.id),
    );
    expect(res201.status).toBe(201);
    expect(lists.length).toBe(1);
    expect(lists[0].order).toBe(0);
  });

  it("FR-006: 存在しない listId の PATCH は 404", async () => {
    loginAs("u1");
    const res = await listPATCH(
      jsonReq(`http://localhost/api/lists/no-such`, { title: "X" }, "PATCH"),
      listCtx("no-such"),
    );
    expect(res.status).toBe(404);
  });
});

describe("cards", () => {
  it("FR-003/005: title と description の PATCH", async () => {
    const board = await createBoard("u1");
    const listRes = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "L" }),
      boardCtx(board.id),
    );
    const list = (await listRes.json()) as List;
    const cardRes = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "C" }),
      listCtx(list.id),
    );
    const card = (await cardRes.json()) as Card;

    const patch1 = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, { description: "d" }, "PATCH"),
      cardCtx(card.id),
    );
    expect(patch1.status).toBe(200);
    const body1 = await patch1.json();
    expect(body1.description).toBe("d");
    expect(body1.title).toBe("C");

    const patch2 = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, {}, "PATCH"),
      cardCtx(card.id),
    );
    expect(patch2.status).toBe(422);
    const body2 = await patch2.json();
    expect(body2.error.details).toEqual({ _root: "no_fields" });
  });

  it("FR-010/011: title 空・201 文字、description 2001 文字は 422", async () => {
    const board = await createBoard("u1");
    const listRes = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "L" }),
      boardCtx(board.id),
    );
    const list = (await listRes.json()) as List;
    const cardRes = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "C" }),
      listCtx(list.id),
    );
    const card = (await cardRes.json()) as Card;

    for (const bad of ["", "a".repeat(201)]) {
      const res = await cardPATCH(
        jsonReq(`http://localhost/api/cards/${card.id}`, { title: bad }, "PATCH"),
        cardCtx(card.id),
      );
      expect(res.status).toBe(422);
    }
    const res2001 = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, { description: "a".repeat(2001) }, "PATCH"),
      cardCtx(card.id),
    );
    expect(res2001.status).toBe(422);
    const stored = cards.find((c) => c.id === card.id);
    expect(stored?.title).toBe("C");
    expect(stored?.description).toBe("");
  });

  it("FR-007: 存在しない listId への一覧は 404", async () => {
    loginAs("u1");
    const res = await cardsGET(bareReq(`http://localhost/api/lists/no-such/cards`), listCtx("no-such"));
    expect(res.status).toBe(404);
  });

  it("FR-008: 閲覧不可 list への POST は 404 を優先", async () => {
    const board = await createBoard("u1");
    const listRes = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "L" }),
      boardCtx(board.id),
    );
    const list = (await listRes.json()) as List;
    loginAs("u2");
    const res = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "" }, "POST"),
      listCtx(list.id),
    );
    expect(res.status).toBe(404);
  });

  it("FR-006: DELETE 後の同 ID PATCH は 404", async () => {
    const board = await createBoard("u1");
    const listRes = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "L" }),
      boardCtx(board.id),
    );
    const list = (await listRes.json()) as List;
    const cardRes = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "C" }),
      listCtx(list.id),
    );
    const card = (await cardRes.json()) as Card;
    const del = await cardDELETE(bareReq(`http://localhost/api/cards/${card.id}`, "DELETE"), cardCtx(card.id));
    expect(del.status).toBe(204);
    const patch = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, { title: "X" }, "PATCH"),
      cardCtx(card.id),
    );
    expect(patch.status).toBe(404);
  });
});
