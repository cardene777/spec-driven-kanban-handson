// spec/009_assignee.md FR-004 / design/009_assignee.md § 純粋関数の契約
// Red: 実装（lib/schemas/assignees.ts）が未実装のため FAIL する。
import { describe, expect, it } from "vitest";
import { isValidAssigneeUserId } from "@/lib/schemas/assignees";

describe("isValidAssigneeUserId (FR-004)", () => {
  it("1文字以上の文字列は妥当（true）", () => {
    expect(isValidAssigneeUserId("u1")).toBe(true);
    expect(isValidAssigneeUserId("a")).toBe(true);
    expect(isValidAssigneeUserId("user_123")).toBe(true);
  });

  it("空文字は不正（false）", () => {
    expect(isValidAssigneeUserId("")).toBe(false);
  });

  it("空白のみは不正（false）", () => {
    expect(isValidAssigneeUserId("   ")).toBe(false);
    expect(isValidAssigneeUserId("\t\n")).toBe(false);
  });

  it("非文字列は不正（false）", () => {
    expect(isValidAssigneeUserId(123)).toBe(false);
    expect(isValidAssigneeUserId(null)).toBe(false);
    expect(isValidAssigneeUserId(undefined)).toBe(false);
    expect(isValidAssigneeUserId({})).toBe(false);
    expect(isValidAssigneeUserId(["u1"])).toBe(false);
    expect(isValidAssigneeUserId(true)).toBe(false);
  });
});

// /test で4軸に拡張（正常系・異常系・境界条件）。状態遷移は純粋関数では観測不能（統合テストの前提待ち）。
describe("isValidAssigneeUserId — 正常系拡張", () => {
  it("前後に空白があっても中身があれば妥当（trim 後に長さが残る）", () => {
    expect(isValidAssigneeUserId("  u1  ")).toBe(true);
    expect(isValidAssigneeUserId("\tu1\n")).toBe(true);
  });

  it("長い文字列も妥当", () => {
    expect(isValidAssigneeUserId("x".repeat(200))).toBe(true);
  });

  it("記号・数字を含む id 文字列も妥当", () => {
    expect(isValidAssigneeUserId("user-123_abc")).toBe(true);
  });
});

describe("isValidAssigneeUserId — 異常系拡張", () => {
  it("全角スペースのみは不正（trim が全角スペースを除去）", () => {
    expect(isValidAssigneeUserId("　")).toBe(false);
    expect(isValidAssigneeUserId("　 \t")).toBe(false);
  });

  it("その他の非文字列型も不正", () => {
    expect(isValidAssigneeUserId(NaN)).toBe(false);
    expect(isValidAssigneeUserId(0)).toBe(false);
    expect(isValidAssigneeUserId(BigInt(10))).toBe(false);
    expect(isValidAssigneeUserId(Symbol("u1"))).toBe(false);
    expect(isValidAssigneeUserId(() => "u1")).toBe(false);
  });
});

describe("isValidAssigneeUserId — 境界条件", () => {
  it("1文字ちょうどは妥当（下限内側）", () => {
    expect(isValidAssigneeUserId("a")).toBe(true);
  });

  it("空白1文字＋中身1文字は妥当", () => {
    expect(isValidAssigneeUserId(" a")).toBe(true);
    expect(isValidAssigneeUserId("a ")).toBe(true);
  });

  it("空文字ちょうどは不正（下限外側）", () => {
    expect(isValidAssigneeUserId("")).toBe(false);
  });
});
