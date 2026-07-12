// spec/013_permissions.md § FR-01 / design/013_permissions.md § 補助関数
import { describe, it, expect } from "vitest";
import { sortMembers } from "@/lib/permissions/sortMembers";

describe("sortMembers", () => {
  it("owner → member → viewer の順に並ぶ", () => {
    const t0 = new Date("2026-07-12T00:00:00.000Z");
    const result = sortMembers([
      { userId: "v1", role: "viewer", createdAt: t0 },
      { userId: "o1", role: "owner", createdAt: t0 },
      { userId: "m1", role: "member", createdAt: t0 },
    ]);
    expect(result.map((r) => r.userId)).toEqual(["o1", "m1", "v1"]);
  });

  it("同ロール内は createdAt 昇順", () => {
    const result = sortMembers([
      {
        userId: "o2",
        role: "owner",
        createdAt: new Date("2026-07-12T10:00:00.000Z"),
      },
      {
        userId: "o1",
        role: "owner",
        createdAt: new Date("2026-07-12T09:00:00.000Z"),
      },
    ]);
    expect(result.map((r) => r.userId)).toEqual(["o1", "o2"]);
  });

  it("同ロール + 同 createdAt は userId 昇順", () => {
    const t = new Date("2026-07-12T00:00:00.000Z");
    const result = sortMembers([
      { userId: "user_b", role: "member", createdAt: t },
      { userId: "user_a", role: "member", createdAt: t },
    ]);
    expect(result.map((r) => r.userId)).toEqual(["user_a", "user_b"]);
  });

  it("元の array を破壊しない (immutability)", () => {
    const input = [
      {
        userId: "v",
        role: "viewer" as const,
        createdAt: new Date(),
      },
      {
        userId: "o",
        role: "owner" as const,
        createdAt: new Date(),
      },
    ];
    const clone = [...input];
    sortMembers(input);
    expect(input).toEqual(clone);
  });
});
