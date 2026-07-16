import { describe, it, expect } from "vitest";
import { computeDueDateStatus, getServerTodayUtc } from "@/lib/dueDate/status";

describe("computeDueDateStatus", () => {
  const today = "2026-07-12";

  it("null → none", () => {
    expect(computeDueDateStatus(null, today)).toBe("none");
  });

  it("same as today → today", () => {
    expect(computeDueDateStatus("2026-07-12", today)).toBe("today");
  });

  it("after today → future", () => {
    expect(computeDueDateStatus("2026-07-13", today)).toBe("future");
    expect(computeDueDateStatus("9999-12-31", today)).toBe("future");
  });

  it("before today → overdue", () => {
    expect(computeDueDateStatus("2026-07-11", today)).toBe("overdue");
    expect(computeDueDateStatus("1970-01-01", today)).toBe("overdue");
  });

  it("uses lexical = date order across month/year boundaries", () => {
    expect(computeDueDateStatus("2026-08-01", "2026-07-31")).toBe("future");
    expect(computeDueDateStatus("2025-12-31", "2026-01-01")).toBe("overdue");
  });
});

describe("getServerTodayUtc", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(getServerTodayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
