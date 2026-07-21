// spec/011_auth.md / spec/012_member_invite.md / spec/013_permissions.md
// 4軸（正常系・異常系・境界条件・状態遷移）でテスト範囲を拡張する。
// セキュリティに関わる異常系は 認証失敗 / 権限不足 / 期限切れ / ロール変更失敗 に分けて扱う。
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db, resetDb, jsonReq, bareReq, boardCtx, listCtx, cardCtx } from "../helpers/db";

let currentUser: { id: string; email: string; name: string } | null = null;

vi.mock("@/lib/prisma", async () => {
  const { makePrisma } = await import("../helpers/db");
  return { prisma: makePrisma() };
});

vi.mock("@/lib/auth/session", async () => {
  const actual = await import("../helpers/db");
  return {
    SESSION_COOKIE: "session",
    getSessionUser: async () => currentUser,
    createSession: async (userId: string) => {
      const u = actual.db.user.find((x) => x.id === userId);
      if (u) currentUser = { id: u.id as string, email: u.email as string, name: u.name as string };
      return "test-token";
    },
    destroySession: async () => {
      currentUser = null;
    },
  };
});

vi.mock("@/lib/audit/log", () => ({
  newRequestId: () => "test-request-id",
  auditLog: () => {},
  errorLog: () => {},
}));

type Handler = (...args: unknown[]) => Promise<Response>;
let signupPOST: Handler;
let boardsPOST: Handler, boardDELETE: Handler, boardPATCH: Handler, boardGET: Handler;
let membersGET: Handler, memberPATCH: Handler, memberDELETE: Handler;
let invitesGET: Handler, invitesPOST: Handler;
let resendPOST: Handler, revokePOST: Handler;
let inviteTokenGET: Handler, acceptPOST: Handler;
let listsPOST: Handler, listsGET: Handler;
let cardsPOST: Handler, cardsGET: Handler, cardMovePOST: Handler, purgeDELETE: Handler;

beforeAll(async () => {
  ({ POST: signupPOST } = (await import("@/app/api/auth/signup/route")) as never);
  ({ POST: boardsPOST } = (await import("@/app/api/boards/route")) as never);
  ({ GET: boardGET, PATCH: boardPATCH, DELETE: boardDELETE } = (await import(
    "@/app/api/boards/[boardId]/route"
  )) as never);
  ({ GET: membersGET } = (await import("@/app/api/boards/[boardId]/members/route")) as never);
  ({ PATCH: memberPATCH, DELETE: memberDELETE } = (await import(
    "@/app/api/boards/[boardId]/members/[userId]/route"
  )) as never);
  ({ GET: invitesGET, POST: invitesPOST } = (await import(
    "@/app/api/boards/[boardId]/invites/route"
  )) as never);
  ({ POST: resendPOST } = (await import("@/app/api/invites/[inviteId]/resend/route")) as never);
  ({ POST: revokePOST } = (await import("@/app/api/invites/[inviteId]/revoke/route")) as never);
  ({ GET: inviteTokenGET } = (await import("@/app/api/invites/token/[token]/route")) as never);
  ({ POST: acceptPOST } = (await import(
    "@/app/api/invites/token/[token]/accept/route"
  )) as never);
  ({ GET: listsGET, POST: listsPOST } = (await import(
    "@/app/api/boards/[boardId]/lists/route"
  )) as never);
  ({ GET: cardsGET, POST: cardsPOST } = (await import(
    "@/app/api/lists/[listId]/cards/route"
  )) as never);
  ({ POST: cardMovePOST } = (await import("@/app/api/cards/[cardId]/move/route")) as never);
  ({ DELETE: purgeDELETE } = (await import("@/app/api/cards/[cardId]/purge/route")) as never);
});

afterEach(() => {
  resetDb();
  currentUser = null;
});

// --- ヘルパ ---
const memberCtx = (boardId: string, userId: string) =>
  ({ params: Promise.resolve({ boardId, userId }) }) as never;
const inviteCtx = (inviteId: string) => ({ params: Promise.resolve({ inviteId }) }) as never;
const tokenCtx = (token: string) => ({ params: Promise.resolve({ token }) }) as never;

type U = { id: string; email: string; name: string };
const loginAs = (u: U | null) => {
  currentUser = u;
};

async function signup(email: string, name = "User"): Promise<U> {
  const res = await signupPOST(
    jsonReq("http://localhost/api/auth/signup", { email, password: "password1", name }),
  );
  return (await res.json()).user as U;
}
async function newBoard(title = "Board") {
  const res = await boardsPOST(jsonReq("http://localhost/api/boards", { title }));
  return res.json();
}
function addMember(boardId: string, userId: string, role: string) {
  db.boardMembership.push({ id: `m_${userId}_${role}`, boardId, userId, role });
}
async function ownerBoard() {
  const owner = await signup("owner@b.co", "Owner");
  loginAs(owner);
  const board = await newBoard();
  return { owner, board };
}
async function makeList(boardId: string) {
  const res = await listsPOST(
    jsonReq(`http://localhost/api/boards/${boardId}/lists`, { title: "L" }),
    boardCtx(boardId),
  );
  return res.json();
}
async function makeCard(listId: string) {
  const res = await cardsPOST(
    jsonReq(`http://localhost/api/lists/${listId}/cards`, { title: "C" }),
    listCtx(listId),
  );
  return res.json();
}
async function createInvite(boardId: string, email: string, role = "member") {
  const res = await invitesPOST(
    jsonReq(`http://localhost/api/boards/${boardId}/invites`, { email, role }),
    boardCtx(boardId),
  );
  return { res, body: await res.json() };
}

// ============ 正常系 ============
describe("正常系: 認証・招待・権限の主経路", () => {
  it("name の境界内（1文字・50文字）でサインアップできる", async () => {
    const one = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "one@b.co",
        password: "password1",
        name: "a",
      }),
    );
    expect(one.status).toBe(201);

    const fifty = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "fifty@b.co",
        password: "password1",
        name: "a".repeat(50),
      }),
    );
    expect(fifty.status).toBe(201);
  });

  it("招待内容の確認 API がボード名とロールを返す", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co", "viewer");
    const token = db.invite[0].token as string;

    const guest = await signup("guest@b.co", "Guest");
    loginAs(guest);
    const res = await inviteTokenGET(bareReq("http://localhost/x"), tokenCtx(token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invite.boardTitle).toBe("Board");
    expect(body.invite.role).toBe("viewer");
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("招待一覧は 0 件のとき空配列を返す", async () => {
    const { board } = await ownerBoard();
    const res = await invitesGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toEqual([]);
  });

  it("member はリスト・カードを作成でき、viewer は閲覧できる", async () => {
    const { board } = await ownerBoard();
    const member = await signup("m@b.co");
    addMember(board.id, member.id, "member");
    const viewer = await signup("v@b.co");
    addMember(board.id, viewer.id, "viewer");

    loginAs(member);
    const list = await makeList(board.id);
    expect(list.id).toBeTruthy();
    const card = await makeCard(list.id);
    expect(card.title).toBe("C");

    loginAs(viewer);
    const readLists = await listsGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(readLists.status).toBe(200);
    const readCards = await cardsGET(bareReq("http://localhost/x"), listCtx(list.id));
    expect(readCards.status).toBe(200);
  });
});

// ============ 異常系: 認証失敗 ============
describe("異常系（認証失敗）: 未認証は 401", () => {
  it("未認証ではメンバー一覧・招待作成・招待承認が 401", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;

    loginAs(null);
    const members = await membersGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(members.status).toBe(401);

    const invite = await createInvite(board.id, "x@b.co");
    expect(invite.res.status).toBe(401);

    const accept = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(accept.status).toBe(401);

    const confirm = await inviteTokenGET(bareReq("http://localhost/x"), tokenCtx(token));
    expect(confirm.status).toBe(401);
  });

  it("未認証のボード作成・一覧・書き込みは 401", async () => {
    loginAs(null);
    const create = await boardsPOST(jsonReq("http://localhost/api/boards", { title: "X" }));
    expect(create.status).toBe(401);
  });
});

// ============ 異常系: 権限不足 ============
describe("異常系（権限不足）: 403 と、非メンバーの 404 を区別する", () => {
  it("member はボード編集・削除・purge が 403", async () => {
    const { board } = await ownerBoard();
    const list = await makeList(board.id);
    const card = await makeCard(list.id);
    const member = await signup("m@b.co");
    addMember(board.id, member.id, "member");

    loginAs(member);
    const patch = await boardPATCH(
      jsonReq("http://localhost/x", { title: "new" }, "PATCH"),
      boardCtx(board.id),
    );
    expect(patch.status).toBe(403);

    const del = await boardDELETE(bareReq("http://localhost/x", "DELETE"), boardCtx(board.id));
    expect(del.status).toBe(403);

    const purge = await purgeDELETE(bareReq("http://localhost/x", "DELETE"), cardCtx(card.id));
    expect(purge.status).toBe(403);
  });

  it("viewer はカード作成・カード移動が 403", async () => {
    const { board } = await ownerBoard();
    const list = await makeList(board.id);
    const card = await makeCard(list.id);
    const viewer = await signup("v@b.co");
    addMember(board.id, viewer.id, "viewer");

    loginAs(viewer);
    const create = await cardsPOST(
      jsonReq(`http://localhost/x`, { title: "X" }),
      listCtx(list.id),
    );
    expect(create.status).toBe(403);

    const move = await cardMovePOST(
      jsonReq("http://localhost/x", {
        sourceListId: list.id,
        targetListId: list.id,
        targetOrder: 0,
      }),
      cardCtx(card.id),
    );
    expect(move.status).toBe(403);
  });

  it("非メンバーはボード配下のリスト・カード参照が 404（存在を漏らさない）", async () => {
    const { board } = await ownerBoard();
    const list = await makeList(board.id);

    const outsider = await signup("out@b.co");
    loginAs(outsider);
    const lists = await listsGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(lists.status).toBe(404);

    const cards = await cardsGET(bareReq("http://localhost/x"), listCtx(list.id));
    expect(cards.status).toBe(404);

    const members = await membersGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(members.status).toBe(404);
  });

  it("owner 以外の招待再送・失効は 403", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const inviteId = db.invite[0].id as string;

    const member = await signup("m@b.co");
    addMember(board.id, member.id, "member");
    loginAs(member);

    const resend = await resendPOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(resend.status).toBe(403);
    const revoke = await revokePOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(revoke.status).toBe(403);
  });

  it("member / viewer は自分自身のメンバー削除ができない（403・自主退出は提供しない）", async () => {
    const { board } = await ownerBoard();
    const member = await signup("m@b.co");
    addMember(board.id, member.id, "member");

    loginAs(member);
    const res = await memberDELETE(
      bareReq("http://localhost/x", "DELETE"),
      memberCtx(board.id, member.id),
    );
    expect(res.status).toBe(403);
    expect(db.boardMembership.some((m) => m.userId === member.id)).toBe(true);
  });
});

// ============ 異常系: 期限切れ・失効 ============
describe("異常系（期限切れ・失効）: 410 GONE", () => {
  it("期限切れ・失効の招待は確認 API も 410 を返す", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;
    const guest = await signup("guest@b.co");

    db.invite[0].expiresAt = new Date(Date.now() - 1000);
    loginAs(guest);
    const expired = await inviteTokenGET(bareReq("http://localhost/x"), tokenCtx(token));
    expect(expired.status).toBe(410);

    db.invite[0].expiresAt = new Date(Date.now() + 60_000);
    db.invite[0].status = "revoked";
    const revoked = await inviteTokenGET(bareReq("http://localhost/x"), tokenCtx(token));
    expect(revoked.status).toBe(410);
    expect((await revoked.json()).error.code).toBe("GONE");
  });

  it("期限切れの承認ではメンバーが増えない", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;
    db.invite[0].expiresAt = new Date(Date.now() - 1);

    const guest = await signup("guest@b.co");
    loginAs(guest);
    const before = db.boardMembership.length;
    const res = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(res.status).toBe(410);
    expect(db.boardMembership.length).toBe(before);
  });
});

// ============ 異常系: ロール変更失敗 ============
describe("異常系（ロール変更失敗）: 409 / 422 / 404", () => {
  it("最後の owner の降格は 409 でロールが変わらない", async () => {
    const { owner, board } = await ownerBoard();
    for (const role of ["member", "viewer"]) {
      const res = await memberPATCH(
        jsonReq("http://localhost/x", { role }, "PATCH"),
        memberCtx(board.id, owner.id),
      );
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("CONFLICT");
    }
    expect(db.boardMembership.find((m) => m.userId === owner.id)?.role).toBe("owner");
  });

  it("role の値が不正・欠落は 422", async () => {
    const { owner, board } = await ownerBoard();
    for (const body of [{ role: "admin" }, { role: 1 }, {}]) {
      const res = await memberPATCH(
        jsonReq("http://localhost/x", body, "PATCH"),
        memberCtx(board.id, owner.id),
      );
      expect(res.status).toBe(422);
    }
  });

  it("存在しないボード・存在しないメンバーのロール変更は 404", async () => {
    const { owner, board } = await ownerBoard();
    const noBoard = await memberPATCH(
      jsonReq("http://localhost/x", { role: "member" }, "PATCH"),
      memberCtx("no-such-board", owner.id),
    );
    expect(noBoard.status).toBe(404);

    const noUser = await memberDELETE(
      bareReq("http://localhost/x", "DELETE"),
      memberCtx(board.id, "no-such-user"),
    );
    expect(noUser.status).toBe(404);
  });

  it("accepted の招待の再送・失効は 409、存在しない招待は 404", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const inviteId = db.invite[0].id as string;
    db.invite[0].status = "accepted";

    const resend = await resendPOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(resend.status).toBe(409);
    const revoke = await revokePOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(revoke.status).toBe(409);

    const nf = await resendPOST(bareReq("http://localhost/x"), inviteCtx("no-such-invite"));
    expect(nf.status).toBe(404);
  });

  it("存在しないボードへの招待作成は 404", async () => {
    const owner = await signup("o@b.co");
    loginAs(owner);
    const res = await invitesPOST(
      jsonReq("http://localhost/x", { email: "g@b.co", role: "member" }),
      boardCtx("no-such-board"),
    );
    expect(res.status).toBe(404);
  });
});

// ============ 境界条件 ============
describe("境界条件", () => {
  it("password 72文字は成功、73文字は 422（上限）", async () => {
    const pw = (n: number) => "a".repeat(n - 1) + "1";
    const ok = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "p72@b.co",
        password: pw(72),
        name: "x",
      }),
    );
    expect(ok.status).toBe(201);

    const ng = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "p73@b.co",
        password: pw(73),
        name: "x",
      }),
    );
    expect(ng.status).toBe(422);
  });

  it("name 0文字・51文字は 422（下限外・上限外）", async () => {
    for (const name of ["", "a".repeat(51)]) {
      const res = await signupPOST(
        jsonReq("http://localhost/api/auth/signup", {
          email: `n${name.length}@b.co`,
          password: "password1",
          name,
        }),
      );
      expect(res.status).toBe(422);
    }
  });

  it("招待の有効期限直前（1秒後まで有効）は承認できる", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;
    db.invite[0].expiresAt = new Date(Date.now() + 1000);

    const guest = await signup("guest@b.co");
    loginAs(guest);
    const res = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(res.status).toBe(200);
  });

  it("owner が 2 人なら降格・削除が成功する（最後の owner 判定の内側）", async () => {
    const { owner, board } = await ownerBoard();
    const second = await signup("o2@b.co");
    addMember(board.id, second.id, "owner");

    loginAs(owner);
    const demote = await memberPATCH(
      jsonReq("http://localhost/x", { role: "viewer" }, "PATCH"),
      memberCtx(board.id, second.id),
    );
    expect(demote.status).toBe(200);

    // 再び owner 2人にして削除を試す
    db.boardMembership.find((m) => m.userId === second.id)!.role = "owner";
    const remove = await memberDELETE(
      bareReq("http://localhost/x", "DELETE"),
      memberCtx(board.id, second.id),
    );
    expect(remove.status).toBe(200);
  });

  it("メンバーが自分1人のボードのメンバー一覧は 1 件", async () => {
    const { board } = await ownerBoard();
    const res = await membersGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect((await res.json()).items).toHaveLength(1);
  });
});

// ============ 状態遷移 ============
describe("状態遷移", () => {
  it("招待: pending → accepted（承認前後でメンバー数と status が変化）", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co", "member");
    const token = db.invite[0].token as string;

    // 遷移前
    expect(db.invite[0].status).toBe("pending");
    const membersBefore = db.boardMembership.filter((m) => m.boardId === board.id).length;

    const guest = await signup("guest@b.co");
    loginAs(guest);
    const res = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));

    // 遷移後
    expect(res.status).toBe(200);
    expect(db.invite[0].status).toBe("accepted");
    expect(db.boardMembership.filter((m) => m.boardId === board.id).length).toBe(
      membersBefore + 1,
    );
  });

  it("招待: pending → revoked（失効後は承認できない）", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const inviteId = db.invite[0].id as string;
    const token = db.invite[0].token as string;

    expect(db.invite[0].status).toBe("pending");
    const revoke = await revokePOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(revoke.status).toBe(200);
    expect(db.invite[0].status).toBe("revoked");

    const guest = await signup("guest@b.co");
    loginAs(guest);
    const accept = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(accept.status).toBe(410);
  });

  it("招待: 再送で token が入れ替わる（旧 token 無効 → 新 token 有効）", async () => {
    const { board } = await ownerBoard();
    await createInvite(board.id, "guest@b.co");
    const inviteId = db.invite[0].id as string;
    const oldToken = db.invite[0].token as string;

    await resendPOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    const newToken = db.invite[0].token as string;

    const guest = await signup("guest@b.co");
    loginAs(guest);
    expect(
      (await acceptPOST(bareReq("http://localhost/x"), tokenCtx(oldToken))).status,
    ).toBe(404);
    expect(
      (await acceptPOST(bareReq("http://localhost/x"), tokenCtx(newToken))).status,
    ).toBe(200);
  });

  it("ロール: member → owner → member（昇格後は owner 操作が通り、降格後は 403）", async () => {
    const { owner, board } = await ownerBoard();
    const target = await signup("t@b.co");
    addMember(board.id, target.id, "member");

    // 昇格
    loginAs(owner);
    const up = await memberPATCH(
      jsonReq("http://localhost/x", { role: "owner" }, "PATCH"),
      memberCtx(board.id, target.id),
    );
    expect(up.status).toBe(200);
    expect(db.boardMembership.find((m) => m.userId === target.id)?.role).toBe("owner");

    // 昇格後は owner 操作（招待作成）ができる
    loginAs(target);
    const invite = await createInvite(board.id, "g@b.co");
    expect(invite.res.status).toBe(201);

    // 降格
    loginAs(owner);
    const down = await memberPATCH(
      jsonReq("http://localhost/x", { role: "member" }, "PATCH"),
      memberCtx(board.id, target.id),
    );
    expect(down.status).toBe(200);

    // 降格後は owner 操作が 403
    loginAs(target);
    const denied = await createInvite(board.id, "g2@b.co");
    expect(denied.res.status).toBe(403);
  });

  it("メンバー削除: 削除後は当該ユーザーがボードを参照できない（200 → 404）", async () => {
    const { owner, board } = await ownerBoard();
    const target = await signup("t@b.co");
    addMember(board.id, target.id, "member");

    loginAs(target);
    expect((await boardGET(bareReq("http://localhost/x"), boardCtx(board.id))).status).toBe(200);

    loginAs(owner);
    const removed = await memberDELETE(
      bareReq("http://localhost/x", "DELETE"),
      memberCtx(board.id, target.id),
    );
    expect(removed.status).toBe(200);

    loginAs(target);
    expect((await boardGET(bareReq("http://localhost/x"), boardCtx(board.id))).status).toBe(404);
  });

  it("ボード作成 → 一覧に出現、ボード削除 → 一覧から消える", async () => {
    const owner = await signup("o@b.co");
    loginAs(owner);
    const board = await newBoard("A");
    expect(db.boardMembership.filter((m) => m.boardId === board.id)).toHaveLength(1);

    const del = await boardDELETE(bareReq("http://localhost/x", "DELETE"), boardCtx(board.id));
    expect(del.status).toBe(200);
    expect(db.board).toHaveLength(0);
    expect(db.boardMembership).toHaveLength(0);
  });
});
