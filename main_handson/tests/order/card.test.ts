import { describe, it, expect } from "vitest";
import { planCardReorder, validateCardReorderIndex } from "@/lib/order/card";

describe("planCardReorder", () => {
  it("same list → same-list plan", () => {
    const plan = planCardReorder({
      fromListId: "L1",
      toListId: "L1",
      oldOrder: 1,
      toIndex: 3,
    });
    expect(plan.kind).toBe("same-list");
  });
  it("cross list → cross-list plan with fromShift/toShift", () => {
    const plan = planCardReorder({
      fromListId: "L1",
      toListId: "L2",
      oldOrder: 2,
      toIndex: 0,
    });
    expect(plan).toEqual({
      kind: "cross-list",
      fromShift: { shiftRangeStart: 3 },
      toShift: { shiftRangeStart: 0 },
    });
  });
});

describe("validateCardReorderIndex", () => {
  it("same list, upper bound = count - 1", () => {
    expect(
      validateCardReorderIndex(2, {
        sameList: true,
        sameListCount: 3,
        toListCount: 3,
      }),
    ).toBeNull();
    expect(
      validateCardReorderIndex(3, {
        sameList: true,
        sameListCount: 3,
        toListCount: 3,
      }),
    ).toBe("out_of_range");
  });
  it("cross list, upper bound = toListCount (allow append)", () => {
    expect(
      validateCardReorderIndex(3, {
        sameList: false,
        sameListCount: 3,
        toListCount: 3,
      }),
    ).toBeNull();
    expect(
      validateCardReorderIndex(4, {
        sameList: false,
        sameListCount: 3,
        toListCount: 3,
      }),
    ).toBe("out_of_range");
  });
  it("negative or non integer → invalid_position", () => {
    expect(
      validateCardReorderIndex(-1, {
        sameList: true,
        sameListCount: 3,
        toListCount: 3,
      }),
    ).toBe("invalid_position");
    expect(
      validateCardReorderIndex(1.5, {
        sameList: false,
        sameListCount: 0,
        toListCount: 3,
      }),
    ).toBe("invalid_position");
  });
});
