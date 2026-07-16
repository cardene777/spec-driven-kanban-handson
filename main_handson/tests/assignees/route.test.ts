import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";

// spec/009_assignee.md § 境界条件:
//   「既に担当者として設定済みの userId を POST: 409 (already_assigned) を返し、
//     一覧の件数と順序は変わらない。」
// この受入条件は担当者が既に上限 (10 名) に達しているカードでも成立する必要がある。
// 既割当ユーザーの再 POST は上限判定 (422 assignees_limit_exceeded) より
// 先に 409 (already_assigned) を返す = 上限判定の前に重複判定を行う。

// 担当者データを保持する in-memory store。 prisma を丸ごと置き換え、
// route が透過的に読み書きする対象を seed 可能にする。
const store = vi.hoisted(() => {
  type Assignee = { cardId: string; userId: string; createdAt: Date };
  const state = {
    users: new Set<string>(),
    memberships: new Map<string, string>(), // `${boardId}:${userId}` -> role
    boards: new Set<string>(),
    assignees: [] as Assignee[],
    createCalls: 0,
  };
  return state;
});

function seedAssignee(cardId: string, userId: string) {
  store.users.add(userId);
  store.memberships.set(`board-1:${userId}`, "member");
  store.assignees.push({ cardId, userId, createdAt: new Date() });
}

const tx = {
  user: {
    findUnique: async ({ where: { id } }: { where: { id: string } }) =>
      store.users.has(id) ? { id } : null,
  },
  boardMembership: {
    findUnique: async ({
      where: { boardId_userId },
    }: {
      where: { boardId_userId: { boardId: string; userId: string } };
    }) => {
      const role = store.memberships.get(
        `${boardId_userId.boardId}:${boardId_userId.userId}`,
      );
      return role ? { role } : null;
    },
  },
  cardAssignee: {
    count: async ({ where: { cardId } }: { where: { cardId: string } }) =>
      store.assignees.filter((a) => a.cardId === cardId).length,
    findUnique: async ({
      where: { cardId_userId },
    }: {
      where: { cardId_userId: { cardId: string; userId: string } };
    }) =>
      store.assignees.find(
        (a) =>
          a.cardId === cardId_userId.cardId &&
          a.userId === cardId_userId.userId,
      ) ?? null,
    create: async ({
      data: { cardId, userId },
    }: {
      data: { cardId: string; userId: string };
    }) => {
      store.createCalls += 1;
      if (store.assignees.some((a) => a.cardId === cardId && a.userId === userId)) {
        throw new Prisma.PrismaClientKnownRequestError("unique", {
          code: "P2002",
          clientVersion: "test",
        });
      }
      const rec = { cardId, userId, createdAt: new Date() };
      store.assignees.push(rec);
      return rec;
    },
  },
  card: { update: async () => ({}) },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    cardAssignee: {
      findMany: async ({ where: { cardId } }: { where: { cardId: string } }) =>
        store.assignees
          .filter((a) => a.cardId === cardId)
          .sort(
            (a, b) =>
              a.createdAt.getTime() - b.createdAt.getTime() ||
              a.userId.localeCompare(b.userId),
          ),
    },
  },
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireCurrentUser: async () => ({ id: "actor-1" }),
}));

vi.mock("@/lib/auth/boardAccess", () => ({
  assertBoardAccess: async () => ({ board: { id: "board-1" }, role: "member" }),
}));

vi.mock("@/lib/auth/cardAccess", () => ({
  resolveBoardFromCard: async (cardId: string) => ({
    id: cardId,
    listId: "list-1",
    order: 0,
    boardId: "board-1",
  }),
}));

import { POST, GET } from "@/app/api/cards/[cardId]/assignees/route";

function postRequest(cardId: string, userId: string) {
  return {
    request: new Request(`http://test/api/cards/${cardId}/assignees`, {
      method: "POST",
      body: JSON.stringify({ userId }),
      headers: { "content-type": "application/json" },
    }),
    ctx: { params: Promise.resolve({ cardId }) },
  };
}

describe("POST /api/cards/{cardId}/assignees の 409 / 422 順序", () => {
  beforeEach(() => {
    store.users.clear();
    store.memberships.clear();
    store.boards.clear();
    store.assignees.length = 0;
    store.createCalls = 0;
  });

  it("担当者 10 名 (上限) のカードに割当済み userId を再 POST すると 409 already_assigned を返し、一覧は 10 件のまま", async () => {
    // 上限ちょうどの 10 名を seed。 うち 1 名 (u-existing) を再 POST 対象にする。
    for (let i = 0; i < 10; i++) {
      seedAssignee("card-1", `u-${i}`);
    }
    const target = "u-3"; // 既に割当済み
    expect(store.assignees).toHaveLength(10);

    const { request, ctx } = postRequest("card-1", target);
    const res = await POST(request, ctx);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("conflict");
    expect(body.fields.userId).toBe("already_assigned");

    // 一覧は 10 件のまま変わらない (create は走っていない)。
    const getRes = await GET(
      new Request("http://test/api/cards/card-1/assignees"),
      { params: Promise.resolve({ cardId: "card-1" }) },
    );
    const getBody = await getRes.json();
    expect(getBody.items).toHaveLength(10);
  });
});
