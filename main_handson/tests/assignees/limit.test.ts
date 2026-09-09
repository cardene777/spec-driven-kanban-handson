// spec/009_assignee.md § 受入条件（純粋関数）FR-005 / § 境界条件
// design/009_assignee.md § 純粋関数の契約 lib/assignees/limit.ts
// Red: lib/assignees/limit.ts が未実装のため FAIL する。
import { describe, it, expect } from "vitest";
import { canAddAssignee, MAX_ASSIGNEES } from "@/lib/assignees/limit";

describe("canAddAssignee (FR-005)", () => {
  it("上限は10名（MAX_ASSIGNEES）", () => {
    expect(MAX_ASSIGNEES).toBe(10);
  });

  it("現在0人は追加を許可（true・境界下限）", () => {
    expect(canAddAssignee(0)).toBe(true);
  });

  it("現在9人は追加を許可（true）", () => {
    expect(canAddAssignee(9)).toBe(true);
  });

  it("現在10人は追加を拒否（false・上限）", () => {
    expect(canAddAssignee(10)).toBe(false);
  });

  it("現在11人（上限超過）は追加を拒否（false）", () => {
    expect(canAddAssignee(11)).toBe(false);
  });

  it("負数・非整数は拒否（false）", () => {
    expect(canAddAssignee(-1)).toBe(false);
    expect(canAddAssignee(1.5)).toBe(false);
  });
});
