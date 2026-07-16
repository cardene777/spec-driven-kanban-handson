import { describe, it, expect } from "vitest";
import { parseCardSearchQuery } from "@/lib/schemas/cardSearch";
import { ValidationError } from "@/lib/http/errors";

function expectField(
  raw: Record<string, string | undefined>,
  key: string,
  message: string,
) {
  try {
    parseCardSearchQuery(raw);
    throw new Error("expected ValidationError");
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields[key]).toBe(message);
  }
}

describe("parseCardSearchQuery", () => {
  it("all defaults when empty", () => {
    const p = parseCardSearchQuery({});
    expect(p.q).toBe("");
    expect(p.keywords).toEqual([]);
    expect(p.labelIds).toEqual([]);
    expect(p.labelsNone).toBe(false);
    expect(p.status).toBe("active");
    expect(p.dueDateFrom).toBeNull();
  });

  it("splits keywords from q", () => {
    expect(parseCardSearchQuery({ q: "bug fix" }).keywords).toEqual(["bug", "fix"]);
  });

  it("q 100 chars ok, 101 → too_long", () => {
    expect(parseCardSearchQuery({ q: "a".repeat(100) }).q.length).toBe(100);
    expectField({ q: "a".repeat(101) }, "q", "too_long");
  });

  it("status enum validated", () => {
    expect(parseCardSearchQuery({ status: "archived" }).status).toBe("archived");
    expectField({ status: "pending" }, "status", "invalid_status");
  });

  it("labelIds parsed as CSV", () => {
    expect(parseCardSearchQuery({ labelIds: "l1,l2,l1" }).labelIds).toEqual(["l1", "l2"]);
  });

  it("labelIds + labelsNone → invalid_labels_options", () => {
    expectField(
      { labelIds: "l1", labelsNone: "true" },
      "labelIds",
      "invalid_labels_options",
    );
  });

  it("labelsNone alone is fine", () => {
    expect(parseCardSearchQuery({ labelsNone: "true" }).labelsNone).toBe(true);
  });

  it("two due-date options → invalid_due_date_options", () => {
    expectField(
      { dueDateOverdue: "true", dueDateToday: "true" },
      "dueDate",
      "invalid_due_date_options",
    );
  });

  it("range counts as one due-date option; range + flag conflicts", () => {
    expect(parseCardSearchQuery({ dueDateFrom: "2026-07-01", dueDateTo: "2026-07-31" }).dueDateFrom).toBe(
      "2026-07-01",
    );
    expectField(
      { dueDateFrom: "2026-07-01", dueDateOverdue: "true" },
      "dueDate",
      "invalid_due_date_options",
    );
  });

  it("dueDateFrom > dueDateTo → invalid_range", () => {
    expectField(
      { dueDateFrom: "2026-08-01", dueDateTo: "2026-07-01" },
      "dueDateFrom",
      "invalid_range",
    );
  });

  // 境界条件: spec/008 § 境界条件 § 期限絞り込み — dueDateFrom == dueDateTo はその日 1 日のみ。
  // from <= to は成立するので invalid_range にならず、両端が同値で受理される。
  it("dueDateFrom == dueDateTo is accepted (single-day range)", () => {
    const p = parseCardSearchQuery({
      dueDateFrom: "2026-07-15",
      dueDateTo: "2026-07-15",
    });
    expect(p.dueDateFrom).toBe("2026-07-15");
    expect(p.dueDateTo).toBe("2026-07-15");
  });

  it("bad date format / impossible date on range", () => {
    expectField({ dueDateFrom: "2026/07/01" }, "dueDateFrom", "invalid_format");
    expectField({ dueDateTo: "2026-02-30" }, "dueDateTo", "invalid_date");
  });

  it("two assignee options → invalid_assignee_options", () => {
    expectField(
      { assigneeMe: "true", assigneeNone: "true" },
      "assignee",
      "invalid_assignee_options",
    );
  });

  it("explicit empty assigneeIds → empty_assignees; omitted is fine", () => {
    expectField({ assigneeIds: "" }, "assigneeIds", "empty_assignees");
    expect(parseCardSearchQuery({}).assigneeIds).toEqual([]);
  });

  it("assigneeIds OR list parsed", () => {
    expect(parseCardSearchQuery({ assigneeIds: "u1,u2" }).assigneeIds).toEqual(["u1", "u2"]);
  });
});
