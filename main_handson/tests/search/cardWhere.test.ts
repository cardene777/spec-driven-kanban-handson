import { describe, it, expect } from "vitest";
import { buildCardWhere } from "@/lib/search/cardWhere";
import { parseCardSearchQuery } from "@/lib/schemas/cardSearch";

const ctx = { boardId: "b1", userId: "u1", today: "2026-07-12" };

function whereFor(raw: Record<string, string | undefined>) {
  return buildCardWhere(parseCardSearchQuery(raw), ctx);
}

describe("buildCardWhere", () => {
  it("always scopes to the board", () => {
    const w = whereFor({});
    expect(w.AND).toContainEqual({ list: { boardId: "b1" } });
  });

  it("keyword expands to title/description/comment OR, ANDed per word", () => {
    const w = whereFor({ q: "bug fix" });
    expect(w.AND).toContainEqual({
      OR: [
        { title: { contains: "bug" } },
        { description: { contains: "bug" } },
        { comments: { some: { body: { contains: "bug" } } } },
      ],
    });
    expect(w.AND).toContainEqual({
      OR: [
        { title: { contains: "fix" } },
        { description: { contains: "fix" } },
        { comments: { some: { body: { contains: "fix" } } } },
      ],
    });
  });

  it("labelIds → some in; labelsNone → none", () => {
    expect(whereFor({ labelIds: "l1,l2" }).AND).toContainEqual({
      cardLabels: { some: { labelId: { in: ["l1", "l2"] } } },
    });
    expect(whereFor({ labelsNone: "true" }).AND).toContainEqual({
      cardLabels: { none: {} },
    });
  });

  it("dueDateNone → dueDate null", () => {
    expect(whereFor({ dueDateNone: "true" }).AND).toContainEqual({ dueDate: null });
  });

  it("dueDateOverdue → lt today", () => {
    expect(whereFor({ dueDateOverdue: "true" }).AND).toContainEqual({
      dueDate: { lt: new Date("2026-07-12T00:00:00.000Z") },
    });
  });

  it("dueDateToday → gte today, lt tomorrow", () => {
    expect(whereFor({ dueDateToday: "true" }).AND).toContainEqual({
      dueDate: {
        gte: new Date("2026-07-12T00:00:00.000Z"),
        lt: new Date("2026-07-13T00:00:00.000Z"),
      },
    });
  });

  it("dueDateWithin7Days → gte today, lte today+6", () => {
    expect(whereFor({ dueDateWithin7Days: "true" }).AND).toContainEqual({
      dueDate: {
        gte: new Date("2026-07-12T00:00:00.000Z"),
        lte: new Date("2026-07-18T00:00:00.000Z"),
      },
    });
  });

  it("range from+to → gte/lte inclusive", () => {
    expect(whereFor({ dueDateFrom: "2026-07-01", dueDateTo: "2026-07-31" }).AND).toContainEqual({
      dueDate: {
        gte: new Date("2026-07-01T00:00:00.000Z"),
        lte: new Date("2026-07-31T00:00:00.000Z"),
      },
    });
  });

  // 境界条件: spec/008 § 境界条件 § 期限絞り込み — 片端のみ指定の開区間。
  it("range from only → gte only (open upper end)", () => {
    expect(whereFor({ dueDateFrom: "2026-07-01" }).AND).toContainEqual({
      dueDate: { gte: new Date("2026-07-01T00:00:00.000Z") },
    });
  });

  it("range to only → lte only (open lower end)", () => {
    expect(whereFor({ dueDateTo: "2026-07-31" }).AND).toContainEqual({
      dueDate: { lte: new Date("2026-07-31T00:00:00.000Z") },
    });
  });

  it("assignee filters use the many-to-many relation", () => {
    expect(whereFor({ assigneeMe: "true" }).AND).toContainEqual({
      assignees: { some: { userId: "u1" } },
    });
    expect(whereFor({ assigneeIds: "a,b" }).AND).toContainEqual({
      assignees: { some: { userId: { in: ["a", "b"] } } },
    });
    expect(whereFor({ assigneeNone: "true" }).AND).toContainEqual({
      assignees: { none: {} },
    });
  });

  it("active status adds no impossible filter", () => {
    expect(whereFor({ status: "active" }).AND).not.toContainEqual({ id: { in: [] } });
  });

  it("non-active status yields an empty-result condition (no status column)", () => {
    expect(whereFor({ status: "archived" }).AND).toContainEqual({ id: { in: [] } });
  });

  // 境界条件: spec/008 § 境界条件 § ラベル絞り込み — labelIds 空配列は「指定なし」と等価で
  // labelsNone としては扱わない。cardLabels 条件を一切積まない。
  it("empty labelIds adds no cardLabels condition (not treated as labelsNone)", () => {
    const conds = (whereFor({ labelIds: "" }).AND ?? []) as Array<
      Record<string, unknown>
    >;
    expect(conds.some((c) => "cardLabels" in c)).toBe(false);
  });

  // 正常系: spec/008 § 検索、絞り込みの合成 — 検索キーワードと各絞り込みは全て AND で合成する。
  // 単一 where の AND に全条件が共存することを観測する。
  it("keyword + label + due + assignee compose into a single AND", () => {
    const and =
      whereFor({
        q: "bug",
        labelIds: "l1",
        dueDateToday: "true",
        assigneeMe: "true",
      }).AND ?? [];
    expect(and).toContainEqual({ list: { boardId: "b1" } });
    expect(and).toContainEqual({
      OR: [
        { title: { contains: "bug" } },
        { description: { contains: "bug" } },
        { comments: { some: { body: { contains: "bug" } } } },
      ],
    });
    expect(and).toContainEqual({ cardLabels: { some: { labelId: { in: ["l1"] } } } });
    expect(and).toContainEqual({
      dueDate: {
        gte: new Date("2026-07-12T00:00:00.000Z"),
        lt: new Date("2026-07-13T00:00:00.000Z"),
      },
    });
    expect(and).toContainEqual({ assignees: { some: { userId: "u1" } } });
  });
});
