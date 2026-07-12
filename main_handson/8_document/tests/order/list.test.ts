import { describe, it, expect } from "vitest";
import { planReorder, validateReorderIndex } from "@/lib/order/list";

describe("planReorder", () => {
  it("same order → noop", () => {
    expect(planReorder(2, 2)).toEqual({ kind: "noop" });
  });
  it("forward move (0 → 3) → shift down [1..3]", () => {
    expect(planReorder(0, 3)).toEqual({
      kind: "shift",
      shiftDirection: "down",
      shiftRangeStart: 1,
      shiftRangeEnd: 3,
    });
  });
  it("backward move (3 → 0) → shift up [0..2]", () => {
    expect(planReorder(3, 0)).toEqual({
      kind: "shift",
      shiftDirection: "up",
      shiftRangeStart: 0,
      shiftRangeEnd: 2,
    });
  });
});

describe("validateReorderIndex", () => {
  it("non integer → invalid_position", () => {
    expect(validateReorderIndex(1.5, 5)).toBe("invalid_position");
  });
  it("negative → invalid_position", () => {
    expect(validateReorderIndex(-1, 5)).toBe("invalid_position");
  });
  it("non number → invalid_position", () => {
    expect(validateReorderIndex("0", 5)).toBe("invalid_position");
  });
  it("equal to count → out_of_range", () => {
    expect(validateReorderIndex(5, 5)).toBe("out_of_range");
  });
  it("upper bound count-1 → ok", () => {
    expect(validateReorderIndex(4, 5)).toBeNull();
  });
  it("zero → ok", () => {
    expect(validateReorderIndex(0, 5)).toBeNull();
  });
});
