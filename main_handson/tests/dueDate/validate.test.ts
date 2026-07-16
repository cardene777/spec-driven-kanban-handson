import { describe, it, expect } from "vitest";
import { isDateFormat, isRealDate } from "@/lib/dueDate/validate";

describe("isDateFormat", () => {
  it("accepts zero-padded YYYY-MM-DD", () => {
    expect(isDateFormat("2026-07-12")).toBe(true);
  });

  it("rejects slashes / missing padding / time suffix / empty", () => {
    expect(isDateFormat("2026/07/12")).toBe(false);
    expect(isDateFormat("2026-7-12")).toBe(false);
    expect(isDateFormat("2026-07-12T00:00:00Z")).toBe(false);
    expect(isDateFormat("")).toBe(false);
  });
});

describe("isRealDate", () => {
  it("accepts valid dates including leap day", () => {
    expect(isRealDate("2026-07-12")).toBe(true);
    expect(isRealDate("2024-02-29")).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(isRealDate("2026-02-30")).toBe(false);
    expect(isRealDate("2025-04-31")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("2026-00-01")).toBe(false);
    expect(isRealDate("2025-02-29")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isRealDate("2026/07/12")).toBe(false);
    expect(isRealDate("")).toBe(false);
  });

  // 境界条件: 日の下限 / 上限外。形式は通るが実在しない日 (00 日 / 32 日) を排除する。
  it("rejects day 00 (lower day bound)", () => {
    expect(isRealDate("2026-01-00")).toBe(false);
  });

  it("rejects day 32 (upper day bound)", () => {
    expect(isRealDate("2026-01-32")).toBe(false);
  });
});
