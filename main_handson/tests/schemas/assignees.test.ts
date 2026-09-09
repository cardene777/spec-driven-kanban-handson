// spec/009_assignee.md § 受入条件（純粋関数）FR-004
// design/009_assignee.md § 純粋関数の契約 lib/schemas/assignees.ts
// Red: lib/schemas/assignees.ts が未実装のため FAIL する。
import { describe, it, expect } from "vitest";
import { isValidAssigneeUserId } from "@/lib/schemas/assignees";

describe("isValidAssigneeUserId (FR-004)", () => {
  it("1文字以上の文字列は妥当（true）", () => {
    expect(isValidAssigneeUserId("u1")).toBe(true);
    expect(isValidAssigneeUserId("a")).toBe(true);
  });

  it("空文字は不正（false）", () => {
    expect(isValidAssigneeUserId("")).toBe(false);
  });

  it("前後の空白を除くと空になる文字列は不正（false）", () => {
    expect(isValidAssigneeUserId("   ")).toBe(false);
    expect(isValidAssigneeUserId("\t\n")).toBe(false);
  });

  it("前後に空白があっても中身が残れば妥当（trim 後に1文字以上）", () => {
    expect(isValidAssigneeUserId("  u1  ")).toBe(true);
    expect(isValidAssigneeUserId("\tu1\n")).toBe(true);
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
