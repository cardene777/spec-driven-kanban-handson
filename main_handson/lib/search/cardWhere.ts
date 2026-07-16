// design/008_search_filter.md § Prisma クエリ組立て SSOT
// 検証済みの検索パラメータを Prisma の CardWhereInput に変換する純粋関数。
//
// 実コードベースへの適合メモ (design 前提との差分):
// - 担当者は単一 assigneeId ではなく CardAssignee 中間テーブル (多対多) のため
//   assignees relation の some / none で合成する。
// - Card に status 列が存在しない (アーカイブ機能未実装) ため、status=active 以外は
//   該当 0 件になる条件を積む。
// - SQLite provider は Prisma の mode:"insensitive" を非対応 (Postgres 専用) のため
//   付与しない。SQLite の LIKE は ASCII について既定で大小非依存。
import type { Prisma } from "@prisma/client";
import { fromDateOnly, addDaysUtc } from "@/lib/dueDate/serialize";
import type { ParsedCardSearchQuery } from "@/lib/schemas/cardSearch";

export type BuildCardWhereContext = {
  boardId: string;
  userId: string;
  today: string; // YYYY-MM-DD (サーバー UTC 日付)
};

export function buildCardWhere(
  params: ParsedCardSearchQuery,
  ctx: BuildCardWhereContext,
): Prisma.CardWhereInput {
  const and: Prisma.CardWhereInput[] = [];

  // ボードスコープ
  and.push({ list: { boardId: ctx.boardId } });

  // キーワード = 各語を AND、語内は title / description / comment の OR
  for (const keyword of params.keywords) {
    and.push({
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { comments: { some: { body: { contains: keyword } } } },
      ],
    });
  }

  // ラベル
  if (params.labelIds.length > 0) {
    and.push({ cardLabels: { some: { labelId: { in: params.labelIds } } } });
  } else if (params.labelsNone) {
    and.push({ cardLabels: { none: {} } });
  }

  // 期限 (排他はパース時に検証済み)
  const at = (d: string) => fromDateOnly(d) as Date;
  if (params.dueDateNone) {
    and.push({ dueDate: null });
  } else if (params.dueDateOverdue) {
    and.push({ dueDate: { lt: at(ctx.today) } });
  } else if (params.dueDateToday) {
    and.push({ dueDate: { gte: at(ctx.today), lt: at(addDaysUtc(ctx.today, 1)) } });
  } else if (params.dueDateWithin7Days) {
    and.push({ dueDate: { gte: at(ctx.today), lte: at(addDaysUtc(ctx.today, 6)) } });
  } else if (params.dueDateFrom !== null || params.dueDateTo !== null) {
    const range: Prisma.DateTimeFilter = {};
    if (params.dueDateFrom !== null) range.gte = at(params.dueDateFrom);
    if (params.dueDateTo !== null) range.lte = at(params.dueDateTo);
    and.push({ dueDate: range });
  }

  // 担当者 (多対多 CardAssignee 経由)
  if (params.assigneeMe) {
    and.push({ assignees: { some: { userId: ctx.userId } } });
  } else if (params.assigneeIds.length > 0) {
    and.push({ assignees: { some: { userId: { in: params.assigneeIds } } } });
  } else if (params.assigneeNone) {
    and.push({ assignees: { none: {} } });
  }

  // ステータス: status 列が無いため active のみ結果を返し、他は 0 件条件を積む。
  if (params.status !== "active") {
    and.push({ id: { in: [] } });
  }

  return { AND: and };
}
