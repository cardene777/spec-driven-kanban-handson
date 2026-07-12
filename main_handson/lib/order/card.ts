// design/003_cards.md § 実装方針 SSOT
// 同一リスト内 old→new と別リスト間 fromList / toList の 2 モードを pure 化する。
import { planReorder, type ReorderPlan } from "./list";

export type CardReorderPlan =
  | { kind: "same-list"; plan: ReorderPlan }
  | {
      kind: "cross-list";
      fromShift: { shiftRangeStart: number };
      toShift: { shiftRangeStart: number };
    };

export function planCardReorder(params: {
  fromListId: string;
  toListId: string;
  oldOrder: number;
  toIndex: number;
}): CardReorderPlan {
  if (params.fromListId === params.toListId) {
    return {
      kind: "same-list",
      plan: planReorder(params.oldOrder, params.toIndex),
    };
  }
  return {
    kind: "cross-list",
    fromShift: { shiftRangeStart: params.oldOrder + 1 },
    toShift: { shiftRangeStart: params.toIndex },
  };
}

export function validateCardReorderIndex(
  toIndex: unknown,
  opts: { sameList: boolean; sameListCount: number; toListCount: number },
): "invalid_position" | "out_of_range" | null {
  if (typeof toIndex !== "number" || !Number.isInteger(toIndex) || toIndex < 0) {
    return "invalid_position";
  }
  // spec/003_cards.md § バリデーション: 同一リストは self を含む count-1 まで、 別リストは toCount まで (末尾追加を許すため)
  const upperBound = opts.sameList ? opts.sameListCount - 1 : opts.toListCount;
  if (toIndex > upperBound) return "out_of_range";
  return null;
}
