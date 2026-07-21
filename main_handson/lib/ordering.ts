// design/004_card_movement_archive_restore.md § 並び順の再計算
// 現在順の id 配列から対象を抜き、targetOrder（挿入インデックス）に挿入して
// 先頭から 0,1,2,… を割り当てた {id, order}[] を返す純関数。

export function insertableLength(orderedIds: string[], movingId: string): number {
  // 対象を除いた配列長。targetOrder の有効範囲は 0..この値。
  return orderedIds.filter((id) => id !== movingId).length;
}

export function computeReorder(
  orderedIds: string[],
  movingId: string,
  targetOrder: number,
): { id: string; order: number }[] {
  const without = orderedIds.filter((id) => id !== movingId);
  without.splice(targetOrder, 0, movingId);
  return without.map((id, index) => ({ id, order: index }));
}

// 対象を含めない配列を 0..n-1 に詰め直す（アーカイブ/削除で抜けた後の再採番用）。
export function compactOrder(orderedIds: string[]): { id: string; order: number }[] {
  return orderedIds.map((id, index) => ({ id, order: index }));
}
