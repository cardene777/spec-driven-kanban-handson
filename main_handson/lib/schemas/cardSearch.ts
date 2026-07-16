// spec/008_search_filter.md § クエリパラメータ / § バリデーション / § 異常系 SSOT
// design/008_search_filter.md § クエリパラメータの解析 / § 排他条件検証
import { ValidationError } from "@/lib/http/errors";
import { isDateFormat, isRealDate } from "@/lib/dueDate/validate";
import { parseBooleanQuery, splitCsv, splitKeywords } from "@/lib/search/params";

const STATUS_VALUES = ["active", "archived", "deleted"] as const;
export type CardSearchStatus = (typeof STATUS_VALUES)[number];

export type ParsedCardSearchQuery = {
  q: string;
  keywords: string[];
  labelIds: string[];
  labelsNone: boolean;
  dueDateNone: boolean;
  dueDateOverdue: boolean;
  dueDateToday: boolean;
  dueDateWithin7Days: boolean;
  dueDateFrom: string | null;
  dueDateTo: string | null;
  assigneeMe: boolean;
  assigneeIds: string[];
  assigneeNone: boolean;
  status: CardSearchStatus;
};

// URLSearchParams から抽出した生パラメータ (undefined = 未指定、 "" = 明示空) を検証する。
export function parseCardSearchQuery(
  raw: Record<string, string | undefined>,
): ParsedCardSearchQuery {
  const q = raw.q ?? "";
  if (q.length > 100) throw new ValidationError({ q: "too_long" });

  const status = raw.status ?? "active";
  if (!(STATUS_VALUES as readonly string[]).includes(status)) {
    throw new ValidationError({ status: "invalid_status" });
  }

  const dueDateFrom = parseDateParam(raw.dueDateFrom, "dueDateFrom");
  const dueDateTo = parseDateParam(raw.dueDateTo, "dueDateTo");

  const labelIds = splitCsv(raw.labelIds);
  const labelsNone = parseBooleanQuery(raw.labelsNone);
  if (labelIds.length > 0 && labelsNone) {
    throw new ValidationError({ labelIds: "invalid_labels_options" });
  }

  const dueDateNone = parseBooleanQuery(raw.dueDateNone);
  const dueDateOverdue = parseBooleanQuery(raw.dueDateOverdue);
  const dueDateToday = parseBooleanQuery(raw.dueDateToday);
  const dueDateWithin7Days = parseBooleanQuery(raw.dueDateWithin7Days);
  const hasRange = dueDateFrom !== null || dueDateTo !== null;
  const dueOptionCount =
    Number(dueDateNone) +
    Number(dueDateOverdue) +
    Number(dueDateToday) +
    Number(dueDateWithin7Days) +
    Number(hasRange);
  if (dueOptionCount >= 2) {
    throw new ValidationError({ dueDate: "invalid_due_date_options" });
  }
  if (dueDateFrom !== null && dueDateTo !== null && dueDateFrom > dueDateTo) {
    throw new ValidationError({ dueDateFrom: "invalid_range" });
  }

  const assigneeMe = parseBooleanQuery(raw.assigneeMe);
  const assigneeNone = parseBooleanQuery(raw.assigneeNone);
  // 明示的に空文字で渡された assigneeIds は empty_assignees (未指定は許容)。
  if (raw.assigneeIds !== undefined && splitCsv(raw.assigneeIds).length === 0) {
    throw new ValidationError({ assigneeIds: "empty_assignees" });
  }
  const assigneeIds = splitCsv(raw.assigneeIds);
  const assigneeOptionCount =
    Number(assigneeMe) + Number(assigneeIds.length > 0) + Number(assigneeNone);
  if (assigneeOptionCount >= 2) {
    throw new ValidationError({ assignee: "invalid_assignee_options" });
  }

  return {
    q,
    keywords: splitKeywords(q),
    labelIds,
    labelsNone,
    dueDateNone,
    dueDateOverdue,
    dueDateToday,
    dueDateWithin7Days,
    dueDateFrom,
    dueDateTo,
    assigneeMe,
    assigneeIds,
    assigneeNone,
    status: status as CardSearchStatus,
  };
}

function parseDateParam(
  value: string | undefined,
  field: string,
): string | null {
  if (value === undefined || value === "") return null;
  if (!isDateFormat(value)) throw new ValidationError({ [field]: "invalid_format" });
  if (!isRealDate(value)) throw new ValidationError({ [field]: "invalid_date" });
  return value;
}
