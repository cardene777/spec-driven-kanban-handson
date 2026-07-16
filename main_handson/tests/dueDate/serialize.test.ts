import { describe, it, expect } from "vitest";
import {
  toDateOnly,
  fromDateOnly,
  addDaysUtc,
  serializeCard,
} from "@/lib/dueDate/serialize";

describe("toDateOnly", () => {
  it("Date → YYYY-MM-DD", () => {
    expect(toDateOnly(new Date("2026-07-12T00:00:00.000Z"))).toBe("2026-07-12");
  });

  it("ISO string → YYYY-MM-DD", () => {
    expect(toDateOnly("2026-07-12T00:00:00.000Z")).toBe("2026-07-12");
  });

  it("null / undefined → null", () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly(undefined)).toBeNull();
  });
});

describe("fromDateOnly", () => {
  it("YYYY-MM-DD → Date at 00:00:00 UTC", () => {
    const d = fromDateOnly("2026-07-12");
    expect(d?.toISOString()).toBe("2026-07-12T00:00:00.000Z");
  });

  it("null → null", () => {
    expect(fromDateOnly(null)).toBeNull();
  });

  it("round-trips with toDateOnly", () => {
    expect(toDateOnly(fromDateOnly("2026-02-28"))).toBe("2026-02-28");
  });
});

describe("addDaysUtc", () => {
  it("adds days within a month", () => {
    expect(addDaysUtc("2026-07-12", 6)).toBe("2026-07-18");
  });

  it("crosses month boundary", () => {
    expect(addDaysUtc("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("crosses year boundary", () => {
    expect(addDaysUtc("2026-12-31", 1)).toBe("2027-01-01");
  });

  // 境界条件: 2 月末をまたぐ加算 (dueDateWithin7Days の範囲計算が閏年で崩れないこと)。
  it("crosses leap-year Feb 28 → Feb 29", () => {
    expect(addDaysUtc("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("crosses non-leap Feb 28 → Mar 1", () => {
    expect(addDaysUtc("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("crosses Feb 29 → Mar 1 in a leap year", () => {
    expect(addDaysUtc("2024-02-29", 1)).toBe("2024-03-01");
  });
});

describe("serializeCard", () => {
  it("converts dueDate to YYYY-MM-DD and passes through other fields", () => {
    const out = serializeCard({
      id: "c1",
      title: "t",
      dueDate: new Date("2026-07-12T00:00:00.000Z"),
    });
    expect(out).toEqual({ id: "c1", title: "t", dueDate: "2026-07-12" });
  });

  it("keeps null dueDate as null", () => {
    expect(serializeCard({ id: "c1", dueDate: null }).dueDate).toBeNull();
  });
});
