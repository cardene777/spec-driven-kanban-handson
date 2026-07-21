// spec/009_assignee.md FR-005 / design/009_assignee.md § 純粋関数の契約
// Red: 実装（lib/assignees/limit.ts）が未実装のため FAIL する。
import { describe, expect, it } from "vitest";
import { canAddAssignee, MAX_ASSIGNEES } from "@/lib/assignees/limit";

describe("canAddAssignee (FR-005)", () => {
  it("上限は10名", () => {
    expect(MAX_ASSIGNEES).toBe(10);
  });

  it("現在0人は追加を許可（true・境界下限）", () => {
    expect(canAddAssignee(0)).toBe(true);
  });

  it("現在9人は追加を許可（true）", () => {
    expect(canAddAssignee(9)).toBe(true);
  });

  it("現在10人は追加を拒否（false）", () => {
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

// /test で4軸に拡張（正常系・異常系・境界条件）。状態遷移は純粋関数では観測不能（統合テストの前提待ち）。
describe("canAddAssignee — 正常系拡張", () => {
  it("上限未満の中間値は許可（true）", () => {
    expect(canAddAssignee(1)).toBe(true);
    expect(canAddAssignee(5)).toBe(true);
    expect(canAddAssignee(8)).toBe(true);
  });
});

describe("canAddAssignee — 境界条件（定数基準）", () => {
  it("上限−1 は許可、上限ちょうどは拒否（MAX_ASSIGNEES 基準）", () => {
    expect(canAddAssignee(MAX_ASSIGNEES - 1)).toBe(true);
    expect(canAddAssignee(MAX_ASSIGNEES)).toBe(false);
    expect(canAddAssignee(MAX_ASSIGNEES + 1)).toBe(false);
  });

  it("下限0は許可、−1は拒否", () => {
    expect(canAddAssignee(0)).toBe(true);
    expect(canAddAssignee(-1)).toBe(false);
  });
});

describe("canAddAssignee — 異常系拡張", () => {
  it("NaN / Infinity は拒否（false）", () => {
    expect(canAddAssignee(NaN)).toBe(false);
    expect(canAddAssignee(Infinity)).toBe(false);
    expect(canAddAssignee(-Infinity)).toBe(false);
  });

  it("非整数（上限付近含む）は拒否（false）", () => {
    expect(canAddAssignee(9.9)).toBe(false);
    expect(canAddAssignee(9.999)).toBe(false);
    expect(canAddAssignee(0.1)).toBe(false);
  });

  it("上限を大きく超える値は拒否（false）", () => {
    expect(canAddAssignee(100)).toBe(false);
  });
});
