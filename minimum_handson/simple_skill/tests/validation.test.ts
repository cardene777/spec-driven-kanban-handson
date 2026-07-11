// spec/005_shared_rules.md FR-002 trim 挙動 / title 境界値
import { describe, it, expect } from "vitest";
import { trimTitle, validateTitle } from "@/lib/validation";

describe("trimTitle", () => {
  it("前後の半角・全角スペース・改行・タブを除去する", () => {
    expect(trimTitle("  hello  ")).toBe("hello");
    expect(trimTitle("　hello　")).toBe("hello");
    expect(trimTitle("\n\thello\n")).toBe("hello");
  });

  it("文字列でない値は null", () => {
    expect(trimTitle(123)).toBeNull();
    expect(trimTitle(null)).toBeNull();
    expect(trimTitle(undefined)).toBeNull();
    expect(trimTitle([])).toBeNull();
  });
});

describe("validateTitle (max=100)", () => {
  it("境界値: 1 文字は OK", () => {
    expect(validateTitle("a", 100)).toEqual({ ok: true, value: "a" });
  });
  it("境界値: 100 文字は OK", () => {
    const s = "a".repeat(100);
    expect(validateTitle(s, 100)).toEqual({ ok: true, value: s });
  });
  it("境界値: 101 文字は NG", () => {
    expect(validateTitle("a".repeat(101), 100).ok).toBe(false);
  });
  it("trim 後 0 文字は NG", () => {
    expect(validateTitle("   ", 100).ok).toBe(false);
    expect(validateTitle("　　", 100).ok).toBe(false);
  });
  it("undefined / 非文字列は NG", () => {
    expect(validateTitle(undefined, 100).ok).toBe(false);
    expect(validateTitle(42, 100).ok).toBe(false);
  });
});

describe("validateTitle (max=200)", () => {
  it("境界値: 200 文字 OK / 201 文字 NG", () => {
    expect(validateTitle("a".repeat(200), 200).ok).toBe(true);
    expect(validateTitle("a".repeat(201), 200).ok).toBe(false);
  });
});
