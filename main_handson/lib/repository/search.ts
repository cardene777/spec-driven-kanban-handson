// design/008_search_filter.md § データ取得・絞り込み手順
// 少量データ前提でボードのカードを取得し、アプリ層で絞り込む。
import { prisma } from "@/lib/prisma";

export type DueFilter = "any" | "overdue" | "set" | "unset";
export type StatusFilter = "active" | "archived";

export type SearchParams = {
  keyword: string;
  labelId: string | null;
  due: DueFilter;
  status: StatusFilter;
};

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const searchRepository = {
  async searchBoard(boardId: string, params: SearchParams) {
    const lists = await prisma.list.findMany({ where: { boardId } });
    const listIds = lists.map((l) => l.id);
    if (listIds.length === 0) return [];

    // deleted は常に除外
    const cards = await prisma.card.findMany({
      where: { listId: { in: listIds }, deletedAt: null },
      orderBy: [{ listId: "asc" }, { order: "asc" }],
    });

    // ラベル絞り込み用に対象カード集合を用意
    let labeledCardIds: Set<string> | null = null;
    if (params.labelId) {
      const links = await prisma.cardLabel.findMany({ where: { labelId: params.labelId } });
      labeledCardIds = new Set(links.map((l) => l.cardId));
    }

    const today = startOfTodayUTC();
    const kw = params.keyword.toLowerCase();

    return cards.filter((c) => {
      // status
      if (params.status === "active" && c.archivedAt !== null) return false;
      if (params.status === "archived" && c.archivedAt === null) return false;

      // due
      const due = c.dueDate as Date | null;
      if (params.due === "set" && due === null) return false;
      if (params.due === "unset" && due !== null) return false;
      if (params.due === "overdue" && !(due !== null && due < today)) return false;

      // keyword（ASCII 大文字小文字非依存）
      if (kw.length > 0) {
        const title = String(c.title).toLowerCase();
        const desc = String(c.description).toLowerCase();
        if (!title.includes(kw) && !desc.includes(kw)) return false;
      }

      // label
      if (labeledCardIds && !labeledCardIds.has(c.id)) return false;

      return true;
    });
  },
};
