"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import LabelBadge from "@/components/labels/LabelBadge";
import type { Label } from "@/lib/labels/colors";

// design/008_search_filter.md § UI 構造 > BoardSearchBar + useCardSearch
// 検索バー + 絞り込み。状態を URL クエリと双方向同期し、
// GET /api/boards/{boardId}/cards/search を呼んで表示対象カード ID 集合を親に返す。

type DueMode = "none" | "overdue" | "today" | "within7" | "range" | null;
type AssigneeMode = "me" | "none" | "ids" | null;
type Status = "active" | "archived" | "deleted";

type SearchState = {
  q: string;
  labelIds: string[];
  labelsNone: boolean;
  dueMode: DueMode;
  dueFrom: string;
  dueTo: string;
  assigneeMode: AssigneeMode;
  assigneeIds: string[];
  status: Status;
};

const MANAGED_KEYS = [
  "q",
  "labelIds",
  "labelsNone",
  "dueDateNone",
  "dueDateOverdue",
  "dueDateToday",
  "dueDateWithin7Days",
  "dueDateFrom",
  "dueDateTo",
  "assigneeMe",
  "assigneeIds",
  "assigneeNone",
  "status",
];

function stateFromParams(sp: URLSearchParams): SearchState {
  const labelIds = (sp.get("labelIds") ?? "").split(",").filter(Boolean);
  let dueMode: DueMode = null;
  if (sp.get("dueDateNone") === "true") dueMode = "none";
  else if (sp.get("dueDateOverdue") === "true") dueMode = "overdue";
  else if (sp.get("dueDateToday") === "true") dueMode = "today";
  else if (sp.get("dueDateWithin7Days") === "true") dueMode = "within7";
  else if (sp.get("dueDateFrom") || sp.get("dueDateTo")) dueMode = "range";
  let assigneeMode: AssigneeMode = null;
  if (sp.get("assigneeMe") === "true") assigneeMode = "me";
  else if (sp.get("assigneeNone") === "true") assigneeMode = "none";
  else if (sp.get("assigneeIds")) assigneeMode = "ids";
  const status = (sp.get("status") ?? "active") as Status;
  return {
    q: sp.get("q") ?? "",
    labelIds,
    labelsNone: sp.get("labelsNone") === "true",
    dueMode,
    dueFrom: sp.get("dueDateFrom") ?? "",
    dueTo: sp.get("dueDateTo") ?? "",
    assigneeMode,
    assigneeIds: (sp.get("assigneeIds") ?? "").split(",").filter(Boolean),
    status,
  };
}

function buildQuery(s: SearchState): string {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.labelIds.length > 0) p.set("labelIds", s.labelIds.join(","));
  else if (s.labelsNone) p.set("labelsNone", "true");
  if (s.dueMode === "none") p.set("dueDateNone", "true");
  else if (s.dueMode === "overdue") p.set("dueDateOverdue", "true");
  else if (s.dueMode === "today") p.set("dueDateToday", "true");
  else if (s.dueMode === "within7") p.set("dueDateWithin7Days", "true");
  else if (s.dueMode === "range") {
    if (s.dueFrom) p.set("dueDateFrom", s.dueFrom);
    if (s.dueTo) p.set("dueDateTo", s.dueTo);
  }
  if (s.assigneeMode === "me") p.set("assigneeMe", "true");
  else if (s.assigneeMode === "none") p.set("assigneeNone", "true");
  else if (s.assigneeMode === "ids" && s.assigneeIds.length > 0)
    p.set("assigneeIds", s.assigneeIds.join(","));
  if (s.status !== "active") p.set("status", s.status);
  return p.toString();
}

function isActive(s: SearchState): boolean {
  return buildQuery(s) !== "";
}

const EMPTY: SearchState = {
  q: "",
  labelIds: [],
  labelsNone: false,
  dueMode: null,
  dueFrom: "",
  dueTo: "",
  assigneeMode: null,
  assigneeIds: [],
  status: "active",
};

export default function BoardSearchBar({
  boardId,
  boardLabels,
  boardMembers,
  currentUserId,
  onResultChange,
}: {
  boardId: string;
  boardLabels: Label[];
  boardMembers: { id: string; name: string }[];
  currentUserId: string;
  onResultChange: (visibleCardIds: Set<string> | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<SearchState>(() =>
    stateFromParams(new URLSearchParams(searchParams.toString())),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => buildQuery(state), [state]);

  // URL 同期: managed key のみ差し替え、card 等の他パラメータは保持する。
  const syncUrl = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const k of MANAGED_KEYS) next.delete(k);
    for (const [k, v] of new URLSearchParams(query)) next.set(k, v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [query, pathname, router, searchParams]);

  const seenFirst = useRef(false);
  useEffect(() => {
    // 300ms デバウンス後に URL 同期 + 検索実行
    const t = setTimeout(async () => {
      syncUrl();
      if (!isActive(state)) {
        onResultChange(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/boards/${boardId}/cards/search?${query}`);
      setLoading(false);
      if (res.status === 200) {
        const data = (await res.json()) as { items: { id: string }[] };
        onResultChange(new Set(data.items.map((c) => c.id)));
        return;
      }
      if (res.status === 422) {
        const body = (await res.json()) as { fields?: Record<string, string> };
        setError(Object.values(body.fields ?? {})[0] ?? "検索条件が不正です");
        return;
      }
      setError(`error_${res.status}`);
    }, seenFirst.current ? 300 : 0);
    seenFirst.current = true;
    return () => clearTimeout(t);
    // query が state の全内容を表す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, boardId]);

  function toggleLabel(id: string) {
    setState((s) => {
      const has = s.labelIds.includes(id);
      const labelIds = has
        ? s.labelIds.filter((x) => x !== id)
        : [...s.labelIds, id];
      return { ...s, labelIds, labelsNone: false };
    });
  }

  function setDue(mode: DueMode) {
    setState((s) => ({
      ...s,
      dueMode: s.dueMode === mode ? null : mode,
      dueFrom: mode === "range" ? s.dueFrom : "",
      dueTo: mode === "range" ? s.dueTo : "",
    }));
  }

  function setAssignee(mode: AssigneeMode) {
    setState((s) => ({
      ...s,
      assigneeMode: s.assigneeMode === mode ? null : mode,
      assigneeIds: mode === "ids" ? s.assigneeIds : [],
    }));
  }

  function toggleAssigneeId(id: string) {
    setState((s) => {
      const has = s.assigneeIds.includes(id);
      const assigneeIds = has
        ? s.assigneeIds.filter((x) => x !== id)
        : [...s.assigneeIds, id];
      return { ...s, assigneeMode: "ids", assigneeIds };
    });
  }

  const active = isActive(state);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          type="search"
          aria-label="カードを検索"
          placeholder="カードを検索 (タイトル / 説明 / コメント)"
          maxLength={100}
          value={state.q}
          onChange={(e) => setState((s) => ({ ...s, q: e.target.value }))}
          className="flex-1"
        />
        {loading ? (
          <span className="text-xs text-muted-foreground">検索中...</span>
        ) : null}
        {active ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setState({ ...EMPTY, status: "active" })}
          >
            フィルタをクリア
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4">
        <fieldset className="space-y-1">
          <FieldLabel className="text-xs">ラベル</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {boardLabels.map((l) => (
              <Button
                key={l.id}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={state.labelIds.includes(l.id)}
                className={state.labelIds.includes(l.id) ? "ring-2 ring-ring" : undefined}
                onClick={() => toggleLabel(l.id)}
              >
                <LabelBadge name={l.name} color={l.color} />
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-pressed={state.labelsNone}
              className={state.labelsNone ? "ring-2 ring-ring" : undefined}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  labelsNone: !s.labelsNone,
                  labelIds: [],
                }))
              }
            >
              ラベルなし
            </Button>
          </div>
        </fieldset>

        <fieldset className="space-y-1">
          <FieldLabel className="text-xs">期限</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["none", "期限なし"],
                ["overdue", "期限切れ"],
                ["today", "今日"],
                ["within7", "7日以内"],
                ["range", "期間"],
              ] as [DueMode, string][]
            ).map(([mode, text]) => (
              <Button
                key={mode}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={state.dueMode === mode}
                className={state.dueMode === mode ? "ring-2 ring-ring" : undefined}
                onClick={() => setDue(mode)}
              >
                {text}
              </Button>
            ))}
            {state.dueMode === "range" ? (
              <span className="flex items-center gap-1">
                <Input
                  type="date"
                  aria-label="期限開始"
                  value={state.dueFrom}
                  onChange={(e) => setState((s) => ({ ...s, dueFrom: e.target.value }))}
                  className="w-36"
                />
                <span className="text-xs text-muted-foreground">〜</span>
                <Input
                  type="date"
                  aria-label="期限終了"
                  value={state.dueTo}
                  onChange={(e) => setState((s) => ({ ...s, dueTo: e.target.value }))}
                  className="w-36"
                />
              </span>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="space-y-1">
          <FieldLabel className="text-xs">担当者</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-pressed={state.assigneeMode === "me"}
              className={state.assigneeMode === "me" ? "ring-2 ring-ring" : undefined}
              onClick={() => setAssignee("me")}
            >
              自分
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-pressed={state.assigneeMode === "none"}
              className={state.assigneeMode === "none" ? "ring-2 ring-ring" : undefined}
              onClick={() => setAssignee("none")}
            >
              担当者なし
            </Button>
            {boardMembers
              .filter((m) => m.id !== currentUserId)
              .map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant="outline"
                  size="xs"
                  aria-pressed={
                    state.assigneeMode === "ids" && state.assigneeIds.includes(m.id)
                  }
                  className={
                    state.assigneeMode === "ids" && state.assigneeIds.includes(m.id)
                      ? "ring-2 ring-ring"
                      : undefined
                  }
                  onClick={() => toggleAssigneeId(m.id)}
                >
                  {m.name}
                </Button>
              ))}
          </div>
        </fieldset>

        <fieldset className="space-y-1">
          <FieldLabel className="text-xs">状態</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["active", "アクティブ"],
                ["archived", "アーカイブ"],
                ["deleted", "削除済み"],
              ] as [Status, string][]
            ).map(([st, text]) => (
              <Button
                key={st}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={state.status === st}
                className={state.status === st ? "ring-2 ring-ring" : undefined}
                onClick={() => setState((s) => ({ ...s, status: st }))}
              >
                {text}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>

      {active ? (
        <p className="text-xs text-muted-foreground">フィルタ適用中</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
