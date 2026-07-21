// デザインシステムのデモ用 mock データ。
// 本番運用では実データ取得（メンバー・統計・更新時刻・リスト状態）に置き換える方針。
export type Member = { id: string; name: string };

export const MOCK_MEMBERS: Member[] = [
  { id: "u1", name: "Aoi Tanaka" },
  { id: "u2", name: "Ken Sato" },
  { id: "u3", name: "Mia Kim" },
  { id: "u4", name: "Ryo Ito" },
];

export const CURRENT_USER = {
  id: "me",
  name: "あなた",
  email: "you@example.com",
};

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export type BoardStats = {
  total: number;
  done: number;
  members: Member[];
  updatedLabel: string;
};

const UPDATED_LABELS = ["たった今", "1時間前", "昨日", "3日前", "先週"];

export function boardStats(boardId: string): BoardStats {
  const h = hash(boardId);
  const total = 6 + (h % 12);
  const done = h % (total + 1);
  const memberCount = 2 + (h % 3); // 2〜4名
  return {
    total,
    done,
    members: MOCK_MEMBERS.slice(0, memberCount),
    updatedLabel: UPDATED_LABELS[h % UPDATED_LABELS.length],
  };
}

// リスト状態ドット: backlog=neutral / in-progress=warning / done=success
export function listStatus(listId: string): { color: string; label: string } {
  const kinds = [
    { color: "var(--brand-neutral-400)", label: "backlog" },
    { color: "var(--brand-warning)", label: "in-progress" },
    { color: "var(--brand-success)", label: "done" },
  ];
  return kinds[hash(listId) % kinds.length];
}
