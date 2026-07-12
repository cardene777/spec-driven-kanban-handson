// design/002_lists.md § 実装方針 SSOT
// 対象と移動先の間にあるレコードを ±1 で詰め直す単純再割当方式 pure 化。
export type ReorderPlan =
  | { kind: "noop" }
  | {
      kind: "shift";
      shiftDirection: "up" | "down";
      shiftRangeStart: number;
      shiftRangeEnd: number;
    };

export function planReorder(
  oldOrder: number,
  newOrder: number,
): ReorderPlan {
  if (oldOrder === newOrder) return { kind: "noop" };
  if (newOrder > oldOrder) {
    return {
      kind: "shift",
      shiftDirection: "down",
      shiftRangeStart: oldOrder + 1,
      shiftRangeEnd: newOrder,
    };
  }
  return {
    kind: "shift",
    shiftDirection: "up",
    shiftRangeStart: newOrder,
    shiftRangeEnd: oldOrder - 1,
  };
}

export function validateReorderIndex(
  toIndex: unknown,
  count: number,
): "invalid_position" | "out_of_range" | null {
  if (typeof toIndex !== "number" || !Number.isInteger(toIndex) || toIndex < 0) {
    return "invalid_position";
  }
  if (toIndex >= count) return "out_of_range";
  return null;
}
