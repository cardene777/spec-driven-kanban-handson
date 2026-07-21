// spec/001-004 受入条件から抜粋。Prisma を in-memory mock に差し替え、Route Handler を直接呼ぶ。
// ロール依存の 403 は auth 未接続のため対象外（design/004 § 前提）。状態遷移・並び替え・422 系を検証。
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const boards: Row[] = [];
const lists: Row[] = [];
const cards: Row[] = [];
const labels: Row[] = [];
const cardLabels: Row[] = [];
const memberships: Row[] = [];

let seq = 1;
const genId = () => `id_${seq++}`;

function matchWhere(row: Row, where?: Row): boolean {
  if (!where) return true;
  for (const [k, cond] of Object.entries(where)) {
    // リレーションフィルタ: { memberships: { some: { userId } } }
    if (k === "memberships" && cond && typeof cond === "object" && "some" in (cond as object)) {
      const some = (cond as { some: Row }).some;
      if (!memberships.some((m) => m.boardId === row.id && matchWhere(m, some))) return false;
      continue;
    }
    const v = row[k];
    if (cond === null) {
      if (v !== null && v !== undefined) return false;
    } else if (cond && typeof cond === "object" && "not" in (cond as object)) {
      const not = (cond as { not: unknown }).not;
      if (not === null) {
        if (v === null || v === undefined) return false;
      } else if (v === not) {
        return false;
      }
    } else if (cond && typeof cond === "object" && "in" in (cond as object)) {
      const arr = (cond as { in: unknown[] }).in;
      if (!arr.includes(v)) return false;
    } else if (v !== cond) {
      return false;
    }
  }
  return true;
}

function sortRows(rows: Row[], orderBy?: Row | Row[]): Row[] {
  if (!orderBy) return rows;
  const keys = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const o of keys) {
      const [field, dir] = Object.entries(o)[0] as [string, "asc" | "desc"];
      const av = a[field];
      const bv = b[field];
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if ((av as number) < (bv as number)) cmp = -1;
      else if ((av as number) > (bv as number)) cmp = 1;
      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function makeTable(rows: Row[], defaults: Row = {}) {
  return {
    findMany: async ({ where, orderBy }: { where?: Row; orderBy?: Row | Row[] } = {}) =>
      sortRows(rows.filter((r) => matchWhere(r, where)), orderBy),
    findFirst: async ({ where, orderBy }: { where?: Row; orderBy?: Row | Row[] } = {}) =>
      sortRows(rows.filter((r) => matchWhere(r, where)), orderBy)[0] ?? null,
    findUnique: async ({ where }: { where: Row }) => {
      if ("id" in where) return rows.find((r) => r.id === where.id) ?? null;
      // 複合ユニーク（例 cardId_labelId: { cardId, labelId }）
      const inner = where[Object.keys(where)[0]] as Row;
      return rows.find((r) => matchWhere(r, inner)) ?? null;
    },
    deleteMany: async ({ where }: { where?: Row } = {}) => {
      let count = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matchWhere(rows[i], where)) {
          rows.splice(i, 1);
          count++;
        }
      }
      return { count };
    },
    create: async ({ data }: { data: Row }) => {
      const now = new Date();
      const row: Row = { ...defaults, ...data, id: genId(), createdAt: now, updatedAt: now };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = rows.find((r) => r.id === where.id);
      if (!row) throw new Error("not_found");
      Object.assign(row, data);
      row.updatedAt = new Date();
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const i = rows.findIndex((r) => r.id === where.id);
      if (i < 0) throw new Error("not_found");
      return rows.splice(i, 1)[0];
    },
  };
}

vi.mock("@/lib/audit/log", () => ({
  newRequestId: () => "test-request-id",
  auditLog: () => {},
  errorLog: () => {},
}));

// spec/013: 全 API が認証・権限を要求するため、テストではセッションのみ差し替える
let currentUser: { id: string; email: string; name: string } | null = null;
vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE: "session",
  getSessionUser: async () => currentUser,
  createSession: async () => "test-token",
  destroySession: async () => {
    currentUser = null;
  },
}));

vi.mock("@/lib/prisma", () => {
  const boardTable = makeTable(boards);
  const listTable = makeTable(lists);
  const cardTable = makeTable(cards, { archivedAt: null, deletedAt: null, dueDate: null });
  const labelTable = makeTable(labels);
  const cardLabelTable = makeTable(cardLabels);
  const membershipTable = makeTable(memberships);

  const dropCardLabelsByCard = (cardId: string) => {
    for (let j = cardLabels.length - 1; j >= 0; j--) {
      if (cardLabels[j].cardId === cardId) cardLabels.splice(j, 1);
    }
  };

  // cascade を Prisma の onDelete: Cascade に合わせて再現
  boardTable.delete = async ({ where }: { where: { id: string } }) => {
    const i = boards.findIndex((b) => b.id === where.id);
    if (i < 0) throw new Error("not_found");
    const [board] = boards.splice(i, 1);
    const listIds = lists.filter((l) => l.boardId === where.id).map((l) => l.id);
    for (let j = cards.length - 1; j >= 0; j--) {
      if (listIds.includes(cards[j].listId as string)) {
        dropCardLabelsByCard(cards[j].id as string);
        cards.splice(j, 1);
      }
    }
    for (let j = lists.length - 1; j >= 0; j--) {
      if (lists[j].boardId === where.id) lists.splice(j, 1);
    }
    for (let j = labels.length - 1; j >= 0; j--) {
      if (labels[j].boardId === where.id) labels.splice(j, 1);
    }
    for (let j = memberships.length - 1; j >= 0; j--) {
      if (memberships[j].boardId === where.id) memberships.splice(j, 1);
    }
    return board;
  };
  listTable.delete = async ({ where }: { where: { id: string } }) => {
    const i = lists.findIndex((l) => l.id === where.id);
    if (i < 0) throw new Error("not_found");
    const [list] = lists.splice(i, 1);
    for (let j = cards.length - 1; j >= 0; j--) {
      if (cards[j].listId === where.id) {
        dropCardLabelsByCard(cards[j].id as string);
        cards.splice(j, 1);
      }
    }
    return list;
  };
  cardTable.delete = async ({ where }: { where: { id: string } }) => {
    const i = cards.findIndex((c) => c.id === where.id);
    if (i < 0) throw new Error("not_found");
    dropCardLabelsByCard(where.id);
    return cards.splice(i, 1)[0];
  };
  labelTable.delete = async ({ where }: { where: { id: string } }) => {
    const i = labels.findIndex((l) => l.id === where.id);
    if (i < 0) throw new Error("not_found");
    for (let j = cardLabels.length - 1; j >= 0; j--) {
      if (cardLabels[j].labelId === where.id) cardLabels.splice(j, 1);
    }
    return labels.splice(i, 1)[0];
  };

  const prisma = {
    board: boardTable,
    list: listTable,
    card: cardTable,
    label: labelTable,
    cardLabel: cardLabelTable,
    boardMembership: membershipTable,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  };
  return { prisma };
});

// 遅延 import（mock hoist 回避）
type Handler = (...args: unknown[]) => Promise<Response>;
let boardsGET: Handler, boardsPOST: Handler;
let boardPATCH: Handler, boardDELETE: Handler;
let listsGET: Handler, listsPOST: Handler;
let listMovePOST: Handler;
let cardsGET: Handler, cardsPOST: Handler;
let cardDELETE: Handler, cardDetailGET: Handler, cardPATCH: Handler;
let cardMovePOST: Handler, archivePOST: Handler, unarchivePOST: Handler;
let restorePOST: Handler, purgeDELETE: Handler;
let labelsGET: Handler, labelsPOST: Handler, labelPATCH: Handler, labelDELETE: Handler;
let cardLabelPOST: Handler, cardLabelDELETE: Handler, searchGET: Handler;

beforeAll(async () => {
  ({ GET: boardsGET, POST: boardsPOST } = (await import("@/app/api/boards/route")) as never);
  ({ PATCH: boardPATCH, DELETE: boardDELETE } = (await import(
    "@/app/api/boards/[boardId]/route"
  )) as never);
  ({ GET: listsGET, POST: listsPOST } = (await import(
    "@/app/api/boards/[boardId]/lists/route"
  )) as never);
  ({ POST: listMovePOST } = (await import("@/app/api/lists/[listId]/move/route")) as never);
  ({ GET: cardsGET, POST: cardsPOST } = (await import(
    "@/app/api/lists/[listId]/cards/route"
  )) as never);
  ({
    GET: cardDetailGET,
    PATCH: cardPATCH,
    DELETE: cardDELETE,
  } = (await import("@/app/api/cards/[cardId]/route")) as never);
  ({ POST: cardMovePOST } = (await import("@/app/api/cards/[cardId]/move/route")) as never);
  ({ POST: archivePOST } = (await import("@/app/api/cards/[cardId]/archive/route")) as never);
  ({ POST: unarchivePOST } = (await import(
    "@/app/api/cards/[cardId]/unarchive/route"
  )) as never);
  ({ POST: restorePOST } = (await import("@/app/api/cards/[cardId]/restore/route")) as never);
  ({ DELETE: purgeDELETE } = (await import("@/app/api/cards/[cardId]/purge/route")) as never);
  ({ GET: labelsGET, POST: labelsPOST } = (await import(
    "@/app/api/boards/[boardId]/labels/route"
  )) as never);
  ({ PATCH: labelPATCH, DELETE: labelDELETE } = (await import(
    "@/app/api/labels/[labelId]/route"
  )) as never);
  ({ POST: cardLabelPOST } = (await import("@/app/api/cards/[cardId]/labels/route")) as never);
  ({ DELETE: cardLabelDELETE } = (await import(
    "@/app/api/cards/[cardId]/labels/[labelId]/route"
  )) as never);
  ({ GET: searchGET } = (await import("@/app/api/boards/[boardId]/search/route")) as never);
});

afterEach(() => {
  currentUser = null;
  memberships.length = 0;
  boards.length = 0;
  lists.length = 0;
  cards.length = 0;
  labels.length = 0;
  cardLabels.length = 0;
  seq = 1;
});

function jsonReq(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown;
}
function bareReq(url: string, method: "GET" | "DELETE" = "GET") {
  return new Request(url, { method }) as unknown;
}
const boardCtx = (boardId: string) => ({ params: Promise.resolve({ boardId }) });
const listCtx = (listId: string) => ({ params: Promise.resolve({ listId }) });
const cardCtx = (cardId: string) => ({ params: Promise.resolve({ cardId }) });

function loginAsTestUser() {
  currentUser = { id: "u_test", email: "test@example.com", name: "Test" };
}

async function createBoard(title = "Board") {
  loginAsTestUser();
  const res = await boardsPOST(jsonReq("http://localhost/api/boards", { title }));
  return res.json();
}
async function createList(boardId: string, title = "L") {
  const res = await listsPOST(
    jsonReq(`http://localhost/api/boards/${boardId}/lists`, { title }),
    boardCtx(boardId),
  );
  return res.json();
}
async function createCard(listId: string, title: string) {
  const res = await cardsPOST(
    jsonReq(`http://localhost/api/lists/${listId}/cards`, { title }),
    listCtx(listId),
  );
  return res.json();
}
async function activeTitles(listId: string) {
  const res = await cardsGET(bareReq(`http://localhost/api/lists/${listId}/cards`), listCtx(listId));
  const body = await res.json();
  return body.items.map((c: { title: string }) => c.title);
}

// ---- 既存コア（回帰防止） ----
describe("core boards/lists/cards", () => {
  it("ボード作成 order 連番、一覧 order 昇順", async () => {
    const a = await createBoard("A");
    const b = await createBoard("B");
    expect([a.order, b.order]).toEqual([0, 1]);
    const res = await boardsGET();
    expect((await res.json()).items.map((x: { title: string }) => x.title)).toEqual(["A", "B"]);
  });

  it("ボード名編集の 404、空タイトル 422、削除で cascade", async () => {
    loginAsTestUser();
    const nf = await boardPATCH(
      jsonReq("http://localhost/api/boards/none", { title: "X" }, "PATCH"),
      boardCtx("none"),
    );
    expect(nf.status).toBe(404);

    const bad = await boardsPOST(jsonReq("http://localhost/api/boards", { title: "" }));
    expect(bad.status).toBe(422);

    const board = await createBoard();
    const list = await createList(board.id);
    await createCard(list.id, "C");
    const del = await boardDELETE(bareReq(`http://localhost/api/boards/${board.id}`, "DELETE"), boardCtx(board.id));
    expect(del.status).toBe(200);
    expect(cards.length).toBe(0);
    expect(lists.length).toBe(0);
  });

  it("リスト作成/編集/削除、カード作成の境界", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c = await createCard(list.id, "C");
    expect(c.description).toBe("");
    expect(c.order).toBe(0);

    for (const bad of ["", "a".repeat(201)]) {
      const res = await cardsPOST(
        jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: bad }),
        listCtx(list.id),
      );
      expect(res.status).toBe(422);
    }
    const okDesc = await cardsPOST(
      jsonReq(`http://localhost/api/lists/${list.id}/cards`, { title: "C2", description: "a".repeat(2000) }),
      listCtx(list.id),
    );
    expect(okDesc.status).toBe(201);
  });
});

// ---- spec/004: 移動 ----
describe("card move", () => {
  it("同一リスト内で末尾へ並べ替え、order 再採番", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c0 = await createCard(list.id, "c0");
    await createCard(list.id, "c1");
    await createCard(list.id, "c2");
    const res = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, {
        sourceListId: list.id,
        targetListId: list.id,
        targetOrder: 2,
      }),
      cardCtx(c0.id),
    );
    expect(res.status).toBe(200);
    expect(await activeTitles(list.id)).toEqual(["c1", "c2", "c0"]);
  });

  it("別リストへ移動、listId 変更＋両リスト再採番", async () => {
    const board = await createBoard();
    const l1 = await createList(board.id, "L1");
    const l2 = await createList(board.id, "L2");
    const c0 = await createCard(l1.id, "c0");
    await createCard(l1.id, "c1");
    await createCard(l2.id, "x0");
    const res = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, {
        sourceListId: l1.id,
        targetListId: l2.id,
        targetOrder: 0,
      }),
      cardCtx(c0.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).listId).toBe(l2.id);
    expect(await activeTitles(l1.id)).toEqual(["c1"]);
    expect(await activeTitles(l2.id)).toEqual(["c0", "x0"]);
  });

  it("空リストへ移動 targetOrder=0", async () => {
    const board = await createBoard();
    const l1 = await createList(board.id, "L1");
    const l2 = await createList(board.id, "L2");
    const c0 = await createCard(l1.id, "c0");
    const res = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, {
        sourceListId: l1.id,
        targetListId: l2.id,
        targetOrder: 0,
      }),
      cardCtx(c0.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).order).toBe(0);
  });

  it("sourceList 不一致・別ボード・範囲外・非active・存在なしは 422/404", async () => {
    const b1 = await createBoard("B1");
    const b2 = await createBoard("B2");
    const l1 = await createList(b1.id, "L1");
    const l2 = await createList(b2.id, "L2");
    const c0 = await createCard(l1.id, "c0");

    const mismatch = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, { sourceListId: "wrong", targetListId: l1.id, targetOrder: 0 }),
      cardCtx(c0.id),
    );
    expect(mismatch.status).toBe(422);

    const crossBoard = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, { sourceListId: l1.id, targetListId: l2.id, targetOrder: 0 }),
      cardCtx(c0.id),
    );
    expect(crossBoard.status).toBe(422);

    const range = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, { sourceListId: l1.id, targetListId: l1.id, targetOrder: 5 }),
      cardCtx(c0.id),
    );
    expect(range.status).toBe(422);

    const notFound = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/none/move`, { sourceListId: l1.id, targetListId: l1.id, targetOrder: 0 }),
      cardCtx("none"),
    );
    expect(notFound.status).toBe(404);
  });

  it("リスト並べ替え order 再採番、範囲外 422", async () => {
    const board = await createBoard();
    const a = await createList(board.id, "A");
    const b = await createList(board.id, "B");
    const c = await createList(board.id, "C");
    const res = await listMovePOST(
      jsonReq(`http://localhost/api/lists/${c.id}/move`, { targetOrder: 0 }),
      listCtx(c.id),
    );
    expect(res.status).toBe(200);
    const listed = await listsGET(bareReq(`http://localhost/api/boards/${board.id}/lists`), boardCtx(board.id));
    expect((await listed.json()).items.map((l: { id: string }) => l.id)).toEqual([c.id, a.id, b.id]);

    const bad = await listMovePOST(
      jsonReq(`http://localhost/api/lists/${a.id}/move`, { targetOrder: 9 }),
      listCtx(a.id),
    );
    expect(bad.status).toBe(422);
  });
});

// ---- spec/004: アーカイブ / 削除 / 復元 ----
describe("archive / delete / restore", () => {
  it("archive で active から外れ、archived 一覧に入る。冪等・末尾復元", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c0 = await createCard(list.id, "c0");
    await createCard(list.id, "c1");

    const res = await archivePOST(bareReq(`http://localhost/api/cards/${c0.id}/archive`, "DELETE"), cardCtx(c0.id));
    expect(res.status).toBe(200);
    expect(await activeTitles(list.id)).toEqual(["c1"]);

    const arch = await cardsGET(
      new Request(`http://localhost/api/lists/${list.id}/cards?status=archived`) as unknown,
      listCtx(list.id),
    );
    expect((await arch.json()).items.map((c: { title: string }) => c.title)).toEqual(["c0"]);

    // 冪等
    const again = await archivePOST(bareReq(`http://localhost/api/cards/${c0.id}/archive`), cardCtx(c0.id));
    expect(again.status).toBe(200);

    // 復元は末尾（active 件数 = 1 → order 1）
    const un = await unarchivePOST(bareReq(`http://localhost/api/cards/${c0.id}/unarchive`), cardCtx(c0.id));
    expect((await un.json()).order).toBe(1);
    expect(await activeTitles(list.id)).toEqual(["c1", "c0"]);
  });

  it("DELETE はソフト削除（deletedAt 設定）、restore で戻る", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c0 = await createCard(list.id, "c0");

    const del = await cardDELETE(bareReq(`http://localhost/api/cards/${c0.id}`, "DELETE"), cardCtx(c0.id));
    expect(del.status).toBe(200);
    expect((await del.json()).deletedAt).not.toBeNull();
    expect(await activeTitles(list.id)).toEqual([]);
    expect(cards.length).toBe(1); // 物理削除されない

    const restore = await restorePOST(bareReq(`http://localhost/api/cards/${c0.id}/restore`), cardCtx(c0.id));
    expect(restore.status).toBe(200);
    expect(await activeTitles(list.id)).toEqual(["c0"]);
  });

  it("排他: archived への delete、deleted への archive は 422", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c0 = await createCard(list.id, "c0");

    await archivePOST(bareReq(`http://localhost/api/cards/${c0.id}/archive`), cardCtx(c0.id));
    const delArchived = await cardDELETE(bareReq(`http://localhost/api/cards/${c0.id}`, "DELETE"), cardCtx(c0.id));
    expect(delArchived.status).toBe(422);

    await unarchivePOST(bareReq(`http://localhost/api/cards/${c0.id}/unarchive`), cardCtx(c0.id));
    await cardDELETE(bareReq(`http://localhost/api/cards/${c0.id}`, "DELETE"), cardCtx(c0.id));
    const archiveDeleted = await archivePOST(bareReq(`http://localhost/api/cards/${c0.id}/archive`), cardCtx(c0.id));
    expect(archiveDeleted.status).toBe(422);
  });

  it("move は非 active カードで 422", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c0 = await createCard(list.id, "c0");
    await archivePOST(bareReq(`http://localhost/api/cards/${c0.id}/archive`), cardCtx(c0.id));
    const res = await cardMovePOST(
      jsonReq(`http://localhost/api/cards/${c0.id}/move`, { sourceListId: list.id, targetListId: list.id, targetOrder: 0 }),
      cardCtx(c0.id),
    );
    expect(res.status).toBe(422);
  });

  it("purge は deleted のみ物理削除、非 deleted は 422、status 不正は 422", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const c0 = await createCard(list.id, "c0");

    const purgeActive = await purgeDELETE(bareReq(`http://localhost/api/cards/${c0.id}/purge`, "DELETE"), cardCtx(c0.id));
    expect(purgeActive.status).toBe(422);

    await cardDELETE(bareReq(`http://localhost/api/cards/${c0.id}`, "DELETE"), cardCtx(c0.id));
    const purge = await purgeDELETE(bareReq(`http://localhost/api/cards/${c0.id}/purge`, "DELETE"), cardCtx(c0.id));
    expect(purge.status).toBe(200);
    expect(cards.length).toBe(0);

    const c1 = await createCard(list.id, "c1");
    void c1;
    const badStatus = await cardsGET(
      new Request(`http://localhost/api/lists/${list.id}/cards?status=foo`) as unknown,
      listCtx(list.id),
    );
    expect(badStatus.status).toBe(422);
  });
});

// ---- spec/006: ラベル ----
const labelCtx = (labelId: string) => ({ params: Promise.resolve({ labelId }) });
const cardLabelCtx = (cardId: string, labelId: string) => ({
  params: Promise.resolve({ cardId, labelId }),
});
async function createLabel(boardId: string, name = "L", color = "red") {
  const res = await labelsPOST(
    jsonReq(`http://localhost/api/boards/${boardId}/labels`, { name, color }),
    boardCtx(boardId),
  );
  return res.json();
}

describe("labels", () => {
  it("作成の検証（name 空/51文字 422、color 不正 422、正常 201）", async () => {
    const board = await createBoard();
    for (const bad of [{ name: "", color: "red" }, { name: "a".repeat(51), color: "red" }, { name: "ok", color: "no-such" }]) {
      const res = await labelsPOST(
        jsonReq(`http://localhost/api/boards/${board.id}/labels`, bad),
        boardCtx(board.id),
      );
      expect(res.status).toBe(422);
    }
    const ok = await labelsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/labels`, { name: "Bug", color: "red" }),
      boardCtx(board.id),
    );
    expect(ok.status).toBe(201);
  });

  it("一覧 {items}・0件・board 404、編集・削除で付与も解除", async () => {
    loginAsTestUser();
    const nf = await labelsGET(bareReq("http://localhost/api/boards/none/labels"), boardCtx("none"));
    expect(nf.status).toBe(404);

    const board = await createBoard();
    const empty = await labelsGET(
      bareReq(`http://localhost/api/boards/${board.id}/labels`),
      boardCtx(board.id),
    );
    expect((await empty.json()).items).toEqual([]);

    const label = await createLabel(board.id, "Bug", "red");
    const patch = await labelPATCH(
      jsonReq(`http://localhost/api/labels/${label.id}`, { name: "Fix", color: "green" }, "PATCH"),
      labelCtx(label.id),
    );
    expect(patch.status).toBe(200);
    expect((await patch.json()).name).toBe("Fix");

    // 付与してから削除 → 付与も消える
    const list = await createList(board.id);
    const card = await createCard(list.id, "c");
    await cardLabelPOST(
      jsonReq(`http://localhost/api/cards/${card.id}/labels`, { labelId: label.id }),
      cardCtx(card.id),
    );
    expect(cardLabels.length).toBe(1);
    const del = await labelDELETE(
      bareReq(`http://localhost/api/labels/${label.id}`, "DELETE"),
      labelCtx(label.id),
    );
    expect(del.status).toBe(200);
    expect(cardLabels.length).toBe(0);

    const nf2 = await labelPATCH(
      jsonReq("http://localhost/api/labels/none", { name: "X" }, "PATCH"),
      labelCtx("none"),
    );
    expect(nf2.status).toBe(404);
  });

  it("付与は冪等・越境は 404、解除できる", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, "c");
    const label = await createLabel(board.id);

    const a1 = await cardLabelPOST(
      jsonReq(`http://localhost/api/cards/${card.id}/labels`, { labelId: label.id }),
      cardCtx(card.id),
    );
    expect(a1.status).toBe(201);
    const a2 = await cardLabelPOST(
      jsonReq(`http://localhost/api/cards/${card.id}/labels`, { labelId: label.id }),
      cardCtx(card.id),
    );
    expect(a2.status).toBe(200);
    expect(cardLabels.length).toBe(1);

    // 別ボードのラベルを付与 → 404
    const board2 = await createBoard("B2");
    const label2 = await createLabel(board2.id);
    const cross = await cardLabelPOST(
      jsonReq(`http://localhost/api/cards/${card.id}/labels`, { labelId: label2.id }),
      cardCtx(card.id),
    );
    expect(cross.status).toBe(404);

    const un = await cardLabelDELETE(
      bareReq(`http://localhost/api/cards/${card.id}/labels/${label.id}`, "DELETE"),
      cardLabelCtx(card.id, label.id),
    );
    expect(un.status).toBe(200);
    expect(cardLabels.length).toBe(0);
  });
});

// ---- spec/005 + 007: カード詳細 / 期限 ----
describe("card detail & due date", () => {
  it("詳細は labels/dueDate を含む（初期は [] と null）", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, "c");
    const res = await cardDetailGET(bareReq(`http://localhost/api/cards/${card.id}`), cardCtx(card.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.labels).toEqual([]);
    expect(body.dueDate).toBeNull();

    const label = await createLabel(board.id, "Bug", "red");
    await cardLabelPOST(
      jsonReq(`http://localhost/api/cards/${card.id}/labels`, { labelId: label.id }),
      cardCtx(card.id),
    );
    const res2 = await cardDetailGET(bareReq(`http://localhost/api/cards/${card.id}`), cardCtx(card.id));
    expect((await res2.json()).labels.map((l: { name: string }) => l.name)).toEqual(["Bug"]);

    const nf = await cardDetailGET(bareReq("http://localhost/api/cards/none"), cardCtx("none"));
    expect(nf.status).toBe(404);
  });

  it("dueDate 設定/解除/不正/404", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const card = await createCard(list.id, "c");

    const set = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, { dueDate: "2026-08-01" }, "PATCH"),
      cardCtx(card.id),
    );
    expect(set.status).toBe(200);
    expect((await set.json()).dueDate).not.toBeNull();

    const clear = await cardPATCH(
      jsonReq(`http://localhost/api/cards/${card.id}`, { dueDate: null }, "PATCH"),
      cardCtx(card.id),
    );
    expect((await clear.json()).dueDate).toBeNull();

    for (const bad of ["2026-13-40", "abc"]) {
      const res = await cardPATCH(
        jsonReq(`http://localhost/api/cards/${card.id}`, { dueDate: bad }, "PATCH"),
        cardCtx(card.id),
      );
      expect(res.status).toBe(422);
    }

    const nf = await cardPATCH(
      jsonReq("http://localhost/api/cards/none", { dueDate: "2026-08-01" }, "PATCH"),
      cardCtx("none"),
    );
    expect(nf.status).toBe(404);
  });
});

// ---- spec/008: 検索・絞り込み ----
describe("search & filter", () => {
  function searchReq(boardId: string, query = "") {
    return new Request(`http://localhost/api/boards/${boardId}/search${query}`) as unknown;
  }
  async function ids(res: Response) {
    return (await res.json()).items.map((c: { title: string }) => c.title).sort();
  }

  it("keyword / label / due / status / 0件 と検証", async () => {
    const board = await createBoard();
    const list = await createList(board.id);
    const alpha = await createCard(list.id, "Alpha");
    const beta = await createCard(list.id, "Beta");
    await cardPATCH(
      jsonReq(`http://localhost/api/cards/${beta.id}`, { description: "keyword-in-desc" }, "PATCH"),
      cardCtx(beta.id),
    );
    // 期限: alpha=過去, beta=なし
    await cardPATCH(
      jsonReq(`http://localhost/api/cards/${alpha.id}`, { dueDate: "2000-01-01" }, "PATCH"),
      cardCtx(alpha.id),
    );
    // ラベル: alpha に付与
    const label = await createLabel(board.id, "Bug", "red");
    await cardLabelPOST(
      jsonReq(`http://localhost/api/cards/${alpha.id}/labels`, { labelId: label.id }),
      cardCtx(alpha.id),
    );

    // keyword（title と description、大文字小文字非依存）
    expect(await ids(await searchGET(searchReq(board.id, "?keyword=alph"), boardCtx(board.id)))).toEqual(["Alpha"]);
    expect(await ids(await searchGET(searchReq(board.id, "?keyword=KEYWORD"), boardCtx(board.id)))).toEqual(["Beta"]);
    // 空 keyword は全件
    expect(await ids(await searchGET(searchReq(board.id, ""), boardCtx(board.id)))).toEqual(["Alpha", "Beta"]);
    // label 絞り込み
    expect(await ids(await searchGET(searchReq(board.id, `?labelId=${label.id}`), boardCtx(board.id)))).toEqual(["Alpha"]);
    // due
    expect(await ids(await searchGET(searchReq(board.id, "?due=overdue"), boardCtx(board.id)))).toEqual(["Alpha"]);
    expect(await ids(await searchGET(searchReq(board.id, "?due=set"), boardCtx(board.id)))).toEqual(["Alpha"]);
    expect(await ids(await searchGET(searchReq(board.id, "?due=unset"), boardCtx(board.id)))).toEqual(["Beta"]);

    // status: beta をアーカイブ
    await archivePOST(bareReq(`http://localhost/api/cards/${beta.id}/archive`), cardCtx(beta.id));
    expect(await ids(await searchGET(searchReq(board.id, "?status=active"), boardCtx(board.id)))).toEqual(["Alpha"]);
    expect(await ids(await searchGET(searchReq(board.id, "?status=archived"), boardCtx(board.id)))).toEqual(["Beta"]);

    // 0件
    const none = await searchGET(searchReq(board.id, "?keyword=zzzzz"), boardCtx(board.id));
    expect((await none.json()).items).toEqual([]);
  });

  it("keyword 101文字・due/status 不正は 422、board なしは 404", async () => {
    const board = await createBoard();
    const long = await searchGET(searchReq(board.id, `?keyword=${"a".repeat(101)}`), boardCtx(board.id));
    expect(long.status).toBe(422);
    const badDue = await searchGET(searchReq(board.id, "?due=foo"), boardCtx(board.id));
    expect(badDue.status).toBe(422);
    const badStatus = await searchGET(searchReq(board.id, "?status=foo"), boardCtx(board.id));
    expect(badStatus.status).toBe(422);
    const nf = await searchGET(searchReq("none"), boardCtx("none"));
    expect(nf.status).toBe(404);
  });
});
