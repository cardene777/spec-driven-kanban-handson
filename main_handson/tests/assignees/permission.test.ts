import { describe, it, expect } from "vitest";
import { canManageAssignees } from "@/lib/assignees/permission";

// spec/009_assignee.md § FR-04:
//   「member 以上のユーザーには、担当者領域に追加導線と各担当者バッジ横の解除導線が表示される」
//   「viewer ユーザーには、担当者領域に一覧のみが表示され、追加導線と解除導線は表示されない」
// design/009_assignee.md § 空状態と権限別表示:
//   「追加導線と解除導線は member 以上にのみ表示 (viewer には一覧のみ)」
describe("canManageAssignees", () => {
  it("owner → true (追加 / 解除導線を表示)", () => {
    expect(canManageAssignees("owner")).toBe(true);
  });

  it("member → true (追加 / 解除導線を表示)", () => {
    expect(canManageAssignees("member")).toBe(true);
  });

  it("viewer → false (一覧のみ、導線は非表示)", () => {
    expect(canManageAssignees("viewer")).toBe(false);
  });
});
