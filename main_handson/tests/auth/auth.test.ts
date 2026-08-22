// spec/011_auth.md / spec/012_member_invite.md / spec/013_permissions.md の受入条件から抜粋
// 権限判定（lib/auth/permissions.ts）は実ロジックを通し、セッションのみ差し替える。
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  db,
  resetDb,
  makePrisma,
  jsonReq,
  bareReq,
  boardCtx,
} from "../helpers/db";

// --- セッション差し替え ---
let currentUser: { id: string; email: string; name: string } | null = null;
const sessionMockState = vi.hoisted(() => ({ createError: null as unknown }));
const setCurrentUser = (u: typeof currentUser) => {
  currentUser = u;
};

vi.mock("@/lib/prisma", async () => {
  const { makePrisma: make } = await import("../helpers/db");
  return { prisma: make() };
});

vi.mock("@/lib/auth/session", async () => {
  const actual = await import("../helpers/db");
  return {
    SESSION_COOKIE: "session",
    getSessionUser: async () => currentUser,
    createSession: async (userId: string) => {
      if (sessionMockState.createError) throw sessionMockState.createError;
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

void makePrisma; // helpers の型利用（mock 側で生成）

type Handler = (...args: unknown[]) => Promise<Response>;
let signupPOST: Handler, loginPOST: Handler, logoutPOST: Handler, sessionGET: Handler;
let boardsPOST: Handler, boardsGET: Handler, boardGET: Handler, boardDELETE: Handler;
let membersGET: Handler, memberPATCH: Handler, memberDELETE: Handler;
let invitesPOST: Handler, invitesGET: Handler;
let resendPOST: Handler, revokePOST: Handler, acceptPOST: Handler;
let listsPOST: Handler;

beforeAll(async () => {
  ({ POST: signupPOST } = (await import("@/app/api/auth/signup/route")) as never);
  ({ POST: loginPOST } = (await import("@/app/api/auth/login/route")) as never);
  ({ POST: logoutPOST } = (await import("@/app/api/auth/logout/route")) as never);
  ({ GET: sessionGET } = (await import("@/app/api/auth/session/route")) as never);
  ({ GET: boardsGET, POST: boardsPOST } = (await import("@/app/api/boards/route")) as never);
  ({ GET: boardGET, DELETE: boardDELETE } = (await import(
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
  ({ POST: acceptPOST } = (await import(
    "@/app/api/invites/token/[token]/accept/route"
  )) as never);
  ({ POST: listsPOST } = (await import("@/app/api/boards/[boardId]/lists/route")) as never);
});

afterEach(() => {
  resetDb();
  currentUser = null;
  sessionMockState.createError = null;
});

// --- ヘルパ ---
const memberCtx = (boardId: string, userId: string) =>
  ({ params: Promise.resolve({ boardId, userId }) }) as never;
const inviteCtx = (inviteId: string) =>
  ({ params: Promise.resolve({ inviteId }) }) as never;
const tokenCtx = (token: string) => ({ params: Promise.resolve({ token }) }) as never;
const VALID_PASSWORD = "A1!" + "a".repeat(5);

async function signup(email: string, name = "Test User", password = VALID_PASSWORD) {
  const res = await signupPOST(
    jsonReq("http://localhost/api/auth/signup", { email, password, name }),
  );
  const body = await res.json();
  return { res, user: body.user as { id: string; email: string; name: string } };
}
async function createBoard(title = "Board") {
  const res = await boardsPOST(jsonReq("http://localhost/api/boards", { title }));
  return res.json();
}
function loginAs(user: { id: string; email: string; name: string }) {
  setCurrentUser(user);
}

// ---------- 認証 ----------
describe("auth: signup / login / logout / session", () => {
  it("サインアップは 201・user を返し、passwordHash を含まない", async () => {
    const { res, user } = await signup("a@b.co");
    expect(res.status).toBe(201);
    expect(user.email).toBe("a@b.co");
    expect(JSON.stringify(user)).not.toContain("passwordHash");

    const s = await sessionGET(bareReq("http://localhost/api/auth/session"));
    expect(s.status).toBe(200);
    expect((await s.json()).user.email).toBe("a@b.co");
  });

  it("パスワードはソルト付きハッシュで保存される（平文と一致せず、同一パスワードでも異なる）", async () => {
    await signup("a@b.co");
    await signup("c@d.co");
    const hashes = db.user.map((u) => u.passwordHash as string);
    expect(hashes[0]).not.toBe(VALID_PASSWORD);
    expect(hashes[0]).not.toBe(hashes[1]);
  });

  it("email 重複は 409、形式不正は 422", async () => {
    await signup("a@b.co");
    const dup = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "a@b.co",
        password: VALID_PASSWORD,
        name: "x",
      }),
    );
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("CONFLICT");

    const bad = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "a@b",
        password: VALID_PASSWORD,
        name: "x",
      }),
    );
    expect(bad.status).toBe(422);
  });

  it("セッショントークンの一意制約違反をemail重複409として扱わない", async () => {
    sessionMockState.createError = Object.assign(new Error("duplicate session token"), {
      code: "P2002",
    });

    const res = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "sessionerror@b.co",
        password: VALID_PASSWORD,
        name: "x",
      }),
    );

    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL_ERROR");
  });

  it("同じemailの同時サインアップは片方だけ201、もう片方409になる", async () => {
    const responses = await Promise.all([
      signupPOST(
        jsonReq("http://localhost/api/auth/signup", {
          email: "race@b.co",
          password: VALID_PASSWORD,
          name: "first",
        }),
      ),
      signupPOST(
        jsonReq("http://localhost/api/auth/signup", {
          email: "race@b.co",
          password: VALID_PASSWORD,
          name: "second",
        }),
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(db.user.filter((user) => user.email === "race@b.co")).toHaveLength(1);
  });

  it("パスワードの境界（7文字/文字種不足は 422、8文字は成功）", async () => {
    for (const pw of ["passwd1", "passwordonly", "12345678", "Password1"]) {
      const res = await signupPOST(
        jsonReq("http://localhost/api/auth/signup", {
          email: `x${pw}@b.co`,
          password: pw,
          name: "x",
        }),
      );
      expect(res.status).toBe(422);
    }
    const ok = await signupPOST(
      jsonReq("http://localhost/api/auth/signup", {
        email: "ok@b.co",
        password: VALID_PASSWORD,
        name: "x",
      }),
    );
    expect(ok.status).toBe(201);
  });

  it("ログイン成功は 200、失敗は理由を区別しない同一の 401", async () => {
    await signup("a@b.co");
    setCurrentUser(null);

    const ok = await loginPOST(
      jsonReq("http://localhost/api/auth/login", { email: "a@b.co", password: VALID_PASSWORD }),
    );
    expect(ok.status).toBe(200);

    setCurrentUser(null);
    const noUser = await loginPOST(
      jsonReq("http://localhost/api/auth/login", { email: "none@b.co", password: VALID_PASSWORD }),
    );
    const badPw = await loginPOST(
      jsonReq("http://localhost/api/auth/login", { email: "a@b.co", password: "wrongpass1" }),
    );
    expect(noUser.status).toBe(401);
    expect(badPw.status).toBe(401);
    // ステータス・code・message がすべて同一であること
    expect(await noUser.json()).toEqual(await badPw.json());
  });

  it("ログアウト後のセッション確認は 401、未認証の session も 401", async () => {
    const { user } = await signup("a@b.co");
    loginAs(user);
    const out = await logoutPOST(bareReq("http://localhost/api/auth/logout", "DELETE"));
    expect(out.status).toBe(200);

    const s = await sessionGET(bareReq("http://localhost/api/auth/session"));
    expect(s.status).toBe(401);
    expect((await s.json()).error.code).toBe("UNAUTHORIZED");
  });
});

// ---------- 権限 ----------
describe("permissions: board scope / roles / last owner", () => {
  it("ボード作成で作成者が owner になり、一覧は自分がメンバーのボードのみ返す", async () => {
    const { user: u1 } = await signup("u1@b.co");
    loginAs(u1);
    const board = await createBoard("A");
    expect(
      db.boardMembership.find((m) => m.boardId === board.id && m.userId === u1.id)?.role,
    ).toBe("owner");

    // 作成直後に詳細を取得できる
    const detail = await boardGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(detail.status).toBe(200);

    const { user: u2 } = await signup("u2@b.co");
    loginAs(u2);
    const list = await boardsGET();
    expect((await list.json()).items).toEqual([]);
  });

  it("非メンバーの参照は 404、未認証は 401", async () => {
    const { user: u1 } = await signup("u1@b.co");
    loginAs(u1);
    const board = await createBoard();

    const { user: u2 } = await signup("u2@b.co");
    loginAs(u2);
    const asOther = await boardGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(asOther.status).toBe(404);

    setCurrentUser(null);
    const anon = await boardGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(anon.status).toBe(401);
  });

  it("viewer は書き込みが 403、閲覧は 200", async () => {
    const { user: owner } = await signup("o@b.co");
    loginAs(owner);
    const board = await createBoard();
    const { user: viewer } = await signup("v@b.co");
    db.boardMembership.push({
      id: "m_viewer",
      boardId: board.id,
      userId: viewer.id,
      role: "viewer",
    });

    loginAs(viewer);
    const read = await boardGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(read.status).toBe(200);

    const write = await listsPOST(
      jsonReq(`http://localhost/api/boards/${board.id}/lists`, { title: "L" }),
      boardCtx(board.id),
    );
    expect(write.status).toBe(403);

    const del = await boardDELETE(bareReq("http://localhost/x", "DELETE"), boardCtx(board.id));
    expect(del.status).toBe(403);
  });

  it("メンバー一覧は passwordHash を含まず、ロール変更は owner のみ", async () => {
    const { user: owner } = await signup("o@b.co");
    loginAs(owner);
    const board = await createBoard();
    const { user: other } = await signup("m@b.co");
    db.boardMembership.push({
      id: "m_other",
      boardId: board.id,
      userId: other.id,
      role: "member",
    });

    loginAs(owner);
    const list = await membersGET(bareReq("http://localhost/x"), boardCtx(board.id));
    const body = await list.json();
    expect(list.status).toBe(200);
    expect(body.items.length).toBe(2);
    expect(JSON.stringify(body)).not.toContain("passwordHash");

    const ok = await memberPATCH(
      jsonReq("http://localhost/x", { role: "viewer" }, "PATCH"),
      memberCtx(board.id, other.id),
    );
    expect(ok.status).toBe(200);

    // member 権限では変更できない
    db.boardMembership.find((m) => m.userId === other.id)!.role = "member";
    loginAs(other);
    const denied = await memberPATCH(
      jsonReq("http://localhost/x", { role: "owner" }, "PATCH"),
      memberCtx(board.id, owner.id),
    );
    expect(denied.status).toBe(403);
  });

  it("最後の owner は降格・削除できない（409）、owner が2人なら成功", async () => {
    const { user: owner } = await signup("o@b.co");
    loginAs(owner);
    const board = await createBoard();

    const demote = await memberPATCH(
      jsonReq("http://localhost/x", { role: "member" }, "PATCH"),
      memberCtx(board.id, owner.id),
    );
    expect(demote.status).toBe(409);
    expect(db.boardMembership.find((m) => m.userId === owner.id)?.role).toBe("owner");

    const removeSelf = await memberDELETE(
      bareReq("http://localhost/x", "DELETE"),
      memberCtx(board.id, owner.id),
    );
    expect(removeSelf.status).toBe(409);

    // 2人目を owner にすれば降格できる
    const { user: second } = await signup("o2@b.co");
    db.boardMembership.push({
      id: "m_second",
      boardId: board.id,
      userId: second.id,
      role: "owner",
    });
    loginAs(owner);
    const ok = await memberPATCH(
      jsonReq("http://localhost/x", { role: "member" }, "PATCH"),
      memberCtx(board.id, owner.id),
    );
    expect(ok.status).toBe(200);
  });

  it("role 不正は 422、対象なしは 404", async () => {
    const { user: owner } = await signup("o@b.co");
    loginAs(owner);
    const board = await createBoard();

    const bad = await memberPATCH(
      jsonReq("http://localhost/x", { role: "superuser" }, "PATCH"),
      memberCtx(board.id, owner.id),
    );
    expect(bad.status).toBe(422);

    const nf = await memberPATCH(
      jsonReq("http://localhost/x", { role: "member" }, "PATCH"),
      memberCtx(board.id, "no-such-user"),
    );
    expect(nf.status).toBe(404);
  });
});

// ---------- 招待 ----------
describe("invites: create / accept / resend / revoke", () => {
  async function setupOwnerBoard() {
    const { user: owner } = await signup("o@b.co");
    loginAs(owner);
    const board = await createBoard();
    return { owner, board };
  }
  async function createInvite(boardId: string, email = "guest@b.co", role = "member") {
    const res = await invitesPOST(
      jsonReq(`http://localhost/api/boards/${boardId}/invites`, { email, role }),
      boardCtx(boardId),
    );
    return { res, body: await res.json() };
  }

  it("招待作成は 201・7日後期限・token は 32文字以上かつ毎回異なる", async () => {
    const { board } = await setupOwnerBoard();
    const { res, body } = await createInvite(board.id);
    expect(res.status).toBe(201);
    expect(body.inviteUrl).toMatch(/^\/invites\/.+/);

    const invite = db.invite[0];
    const diffDays =
      (new Date(invite.expiresAt as Date).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(Math.round(diffDays)).toBe(7);
    expect(invite.status).toBe("pending");
    expect((invite.token as string).length).toBeGreaterThanOrEqual(32);

    const second = await createInvite(board.id, "guest2@b.co");
    expect(db.invite[1].token).not.toBe(invite.token);
    expect(second.res.status).toBe(201);
  });

  it("role=owner は 422、email 形式不正は 422、pending 重複は 409", async () => {
    const { board } = await setupOwnerBoard();
    const asOwner = await createInvite(board.id, "g@b.co", "owner");
    expect(asOwner.res.status).toBe(422);

    const badEmail = await createInvite(board.id, "not-an-email");
    expect(badEmail.res.status).toBe(422);

    await createInvite(board.id, "g@b.co");
    const dup = await createInvite(board.id, "g@b.co");
    expect(dup.res.status).toBe(409);
  });

  it("既にメンバーの email への招待は 409", async () => {
    const { owner, board } = await setupOwnerBoard();
    const dup = await createInvite(board.id, owner.email);
    expect(dup.res.status).toBe(409);
  });

  it("owner 以外の招待作成は 403、招待一覧に token を含まない", async () => {
    const { board } = await setupOwnerBoard();
    await createInvite(board.id);

    const list = await invitesGET(bareReq("http://localhost/x"), boardCtx(board.id));
    expect(list.status).toBe(200);
    expect(JSON.stringify(await list.json())).not.toContain("token");

    const { user: member } = await signup("m@b.co");
    db.boardMembership.push({
      id: "m_m",
      boardId: board.id,
      userId: member.id,
      role: "member",
    });
    loginAs(member);
    const denied = await createInvite(board.id, "x@b.co");
    expect(denied.res.status).toBe(403);
  });

  it("承認で BoardMembership が作られ、2回目は 409", async () => {
    const { board } = await setupOwnerBoard();
    await createInvite(board.id, "guest@b.co", "viewer");
    const token = db.invite[0].token as string;

    const { user: guest } = await signup("guest@b.co");
    loginAs(guest);
    const ok = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(ok.status).toBe(200);
    expect(
      db.boardMembership.find((m) => m.boardId === board.id && m.userId === guest.id)?.role,
    ).toBe("viewer");
    expect(db.invite[0].status).toBe("accepted");

    const again = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(again.status).toBe(409);
  });

  it("招待の email と違うユーザーの承認は 403（メンバーにならない）", async () => {
    const { board } = await setupOwnerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;

    const { user: other } = await signup("other@b.co");
    loginAs(other);
    const res = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(res.status).toBe(403);
    expect(db.boardMembership.some((m) => m.userId === other.id)).toBe(false);
  });

  it("期限切れ・失効の承認は 410、存在しない token は 404、未認証は 401", async () => {
    const { board } = await setupOwnerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;
    const { user: guest } = await signup("guest@b.co");

    // 期限切れ
    db.invite[0].expiresAt = new Date(Date.now() - 1000);
    loginAs(guest);
    const expired = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(expired.status).toBe(410);
    expect((await expired.json()).error.code).toBe("GONE");

    // 失効
    db.invite[0].expiresAt = new Date(Date.now() + 1000);
    db.invite[0].status = "revoked";
    const revoked = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(revoked.status).toBe(410);

    const nf = await acceptPOST(bareReq("http://localhost/x"), tokenCtx("no-such-token"));
    expect(nf.status).toBe(404);

    setCurrentUser(null);
    const anon = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(anon.status).toBe(401);
  });

  it("再送で token が変わり旧 token は 404、失効後の承認は 410", async () => {
    const { board } = await setupOwnerBoard();
    await createInvite(board.id, "guest@b.co");
    const inviteId = db.invite[0].id as string;
    const oldToken = db.invite[0].token as string;

    const resend = await resendPOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(resend.status).toBe(200);
    const newToken = db.invite[0].token as string;
    expect(newToken).not.toBe(oldToken);

    const { user: guest } = await signup("guest@b.co");
    loginAs(guest);
    const old = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(oldToken));
    expect(old.status).toBe(404);

    loginAs((await signup("o2@b.co")).user);
    db.boardMembership.push({
      id: "m_o2",
      boardId: board.id,
      userId: db.user.find((u) => u.email === "o2@b.co")!.id as string,
      role: "owner",
    });
    const revoke = await revokePOST(bareReq("http://localhost/x"), inviteCtx(inviteId));
    expect(revoke.status).toBe(200);
    expect(db.invite[0].status).toBe("revoked");

    loginAs(guest);
    const afterRevoke = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(newToken));
    expect(afterRevoke.status).toBe(410);
  });

  it("ボード削除で招待とメンバーシップも消える", async () => {
    const { board } = await setupOwnerBoard();
    await createInvite(board.id, "guest@b.co");
    const token = db.invite[0].token as string;

    const del = await boardDELETE(bareReq("http://localhost/x", "DELETE"), boardCtx(board.id));
    expect(del.status).toBe(200);
    expect(db.invite.length).toBe(0);
    expect(db.boardMembership.length).toBe(0);

    const { user: guest } = await signup("guest@b.co");
    loginAs(guest);
    const res = await acceptPOST(bareReq("http://localhost/x"), tokenCtx(token));
    expect(res.status).toBe(404);
  });
});
