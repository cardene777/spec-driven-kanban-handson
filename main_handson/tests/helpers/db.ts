// テスト用 in-memory Prisma モック（DB 不要）。
// 権限判定（lib/auth/permissions.ts）は実ロジックを通し、セッションのみ差し替える。
export type Row = Record<string, unknown>;

export const db = {
  board: [] as Row[],
  list: [] as Row[],
  card: [] as Row[],
  label: [] as Row[],
  cardLabel: [] as Row[],
  user: [] as Row[],
  session: [] as Row[],
  boardMembership: [] as Row[],
  invite: [] as Row[],
};

let seq = 1;
export const genId = () => `id_${seq++}`;

export function resetDb() {
  for (const key of Object.keys(db) as (keyof typeof db)[]) db[key].length = 0;
  seq = 1;
}

export function matchWhere(row: Row, where?: Row): boolean {
  if (!where) return true;
  for (const [k, cond] of Object.entries(where)) {
    // リレーションフィルタ: { memberships: { some: { userId } } }
    if (k === "memberships" && cond && typeof cond === "object" && "some" in (cond as object)) {
      const some = (cond as { some: Row }).some;
      const ok = db.boardMembership.some(
        (m) => m.boardId === row.id && matchWhere(m, some),
      );
      if (!ok) return false;
      continue;
    }
    const v = row[k];
    if (cond === null) {
      if (v !== null && v !== undefined) return false;
    } else if (cond && typeof cond === "object" && "not" in (cond as object)) {
      const not = (cond as { not: unknown }).not;
      if (not === null) {
        if (v === null || v === undefined) return false;
      } else if (v === not) return false;
    } else if (cond && typeof cond === "object" && "in" in (cond as object)) {
      if (!(cond as { in: unknown[] }).in.includes(v)) return false;
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

function applySelect(row: Row | null, select?: Row): Row | null {
  if (!row || !select) return row;
  const out: Row = {};
  for (const [k, v] of Object.entries(select)) if (v) out[k] = row[k];
  return out;
}

function makeTable(rows: Row[], defaults: Row = {}) {
  return {
    findMany: async ({
      where,
      orderBy,
      select,
    }: { where?: Row; orderBy?: Row | Row[]; select?: Row } = {}) =>
      sortRows(rows.filter((r) => matchWhere(r, where)), orderBy).map(
        (r) => applySelect(r, select) as Row,
      ),
    findFirst: async ({ where, orderBy }: { where?: Row; orderBy?: Row | Row[] } = {}) =>
      sortRows(rows.filter((r) => matchWhere(r, where)), orderBy)[0] ?? null,
    findUnique: async ({ where, select }: { where: Row; select?: Row }) => {
      if ("id" in where) return applySelect(rows.find((r) => r.id === where.id) ?? null, select);
      const key = Object.keys(where)[0];
      const inner = where[key] as Row;
      // 複合ユニーク（boardId_userId / cardId_labelId など）
      if (inner && typeof inner === "object") {
        return applySelect(rows.find((r) => matchWhere(r, inner)) ?? null, select);
      }
      return applySelect(rows.find((r) => matchWhere(r, where)) ?? null, select);
    },
    create: async ({ data, select }: { data: Row; select?: Row }) => {
      const now = new Date();
      const row: Row = { ...defaults, ...data, id: genId(), createdAt: now, updatedAt: now };
      rows.push(row);
      return applySelect(row, select) as Row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row =
        "id" in where
          ? rows.find((r) => r.id === where.id)
          : rows.find((r) => matchWhere(r, where[Object.keys(where)[0]] as Row));
      if (!row) throw new Error("not_found");
      Object.assign(row, data);
      row.updatedAt = new Date();
      return row;
    },
    delete: async ({ where }: { where: Row }) => {
      const idx =
        "id" in where
          ? rows.findIndex((r) => r.id === where.id)
          : rows.findIndex((r) => matchWhere(r, where[Object.keys(where)[0]] as Row));
      if (idx < 0) throw new Error("not_found");
      return rows.splice(idx, 1)[0];
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
  };
}

export function makePrisma() {
  const boardTable = makeTable(db.board);
  const listTable = makeTable(db.list);
  const cardTable = makeTable(db.card, { archivedAt: null, deletedAt: null, dueDate: null });
  const labelTable = makeTable(db.label);
  const cardLabelTable = makeTable(db.cardLabel);
  const userTable = makeTable(db.user);
  const sessionTable = makeTable(db.session);
  const membershipTable = makeTable(db.boardMembership);
  const inviteTable = makeTable(db.invite, { status: "pending" });

  const dropCardLabels = (cardId: string) => {
    for (let i = db.cardLabel.length - 1; i >= 0; i--) {
      if (db.cardLabel[i].cardId === cardId) db.cardLabel.splice(i, 1);
    }
  };

  // onDelete: Cascade の再現
  boardTable.delete = async ({ where }: { where: Row }) => {
    const i = db.board.findIndex((b) => b.id === where.id);
    if (i < 0) throw new Error("not_found");
    const [board] = db.board.splice(i, 1);
    const listIds = db.list.filter((l) => l.boardId === where.id).map((l) => l.id);
    for (let j = db.card.length - 1; j >= 0; j--) {
      if (listIds.includes(db.card[j].listId)) {
        dropCardLabels(db.card[j].id as string);
        db.card.splice(j, 1);
      }
    }
    for (const key of ["list", "label", "boardMembership", "invite"] as const) {
      for (let j = db[key].length - 1; j >= 0; j--) {
        if (db[key][j].boardId === where.id) db[key].splice(j, 1);
      }
    }
    return board;
  };
  listTable.delete = async ({ where }: { where: Row }) => {
    const i = db.list.findIndex((l) => l.id === where.id);
    if (i < 0) throw new Error("not_found");
    const [list] = db.list.splice(i, 1);
    for (let j = db.card.length - 1; j >= 0; j--) {
      if (db.card[j].listId === where.id) {
        dropCardLabels(db.card[j].id as string);
        db.card.splice(j, 1);
      }
    }
    return list;
  };
  cardTable.delete = async ({ where }: { where: Row }) => {
    const i = db.card.findIndex((c) => c.id === where.id);
    if (i < 0) throw new Error("not_found");
    dropCardLabels(where.id as string);
    return db.card.splice(i, 1)[0];
  };
  labelTable.delete = async ({ where }: { where: Row }) => {
    const i = db.label.findIndex((l) => l.id === where.id);
    if (i < 0) throw new Error("not_found");
    for (let j = db.cardLabel.length - 1; j >= 0; j--) {
      if (db.cardLabel[j].labelId === where.id) db.cardLabel.splice(j, 1);
    }
    return db.label.splice(i, 1)[0];
  };

  const prisma = {
    board: boardTable,
    list: listTable,
    card: cardTable,
    label: labelTable,
    cardLabel: cardLabelTable,
    user: userTable,
    session: sessionTable,
    boardMembership: membershipTable,
    invite: inviteTable,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  };
  return prisma;
}

// --- Request ヘルパ ---
export function jsonReq(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as never;
}
export function bareReq(url: string, method: "GET" | "DELETE" = "GET") {
  return new Request(url, { method }) as unknown as never;
}
export const boardCtx = (boardId: string) => ({ params: Promise.resolve({ boardId }) }) as never;
export const listCtx = (listId: string) => ({ params: Promise.resolve({ listId }) }) as never;
export const cardCtx = (cardId: string) => ({ params: Promise.resolve({ cardId }) }) as never;
