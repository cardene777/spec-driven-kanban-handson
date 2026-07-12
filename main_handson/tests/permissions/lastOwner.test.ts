// spec/013_permissions.md § FR-04 / design/013_permissions.md § 補助関数
import { describe, it, expect } from "vitest";
import { isLastOwnerProtected } from "@/lib/permissions/lastOwner";

describe("isLastOwnerProtected", () => {
  it("owner 1 名 + remove → true", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 1,
        targetCurrentRole: "owner",
        operation: "remove",
      }),
    ).toBe(true);
  });

  it("owner 1 名 + owner → member 降格 → true", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 1,
        targetCurrentRole: "owner",
        operation: "change_role",
        newRole: "member",
      }),
    ).toBe(true);
  });

  it("owner 1 名 + owner → viewer 降格 → true", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 1,
        targetCurrentRole: "owner",
        operation: "change_role",
        newRole: "viewer",
      }),
    ).toBe(true);
  });

  it("owner 1 名 + 同ロール (owner → owner) → false (冪等)", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 1,
        targetCurrentRole: "owner",
        operation: "change_role",
        newRole: "owner",
      }),
    ).toBe(false);
  });

  it("owner 2 名 + remove → false", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 2,
        targetCurrentRole: "owner",
        operation: "remove",
      }),
    ).toBe(false);
  });

  it("owner 2 名 + 降格 → false", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 2,
        targetCurrentRole: "owner",
        operation: "change_role",
        newRole: "member",
      }),
    ).toBe(false);
  });

  it("target が member の remove → false", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 1,
        targetCurrentRole: "member",
        operation: "remove",
      }),
    ).toBe(false);
  });

  it("target が viewer の 変更 → false", () => {
    expect(
      isLastOwnerProtected({
        currentOwnerCount: 1,
        targetCurrentRole: "viewer",
        operation: "change_role",
        newRole: "member",
      }),
    ).toBe(false);
  });
});
