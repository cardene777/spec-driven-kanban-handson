// design/012_member_invite.md § 補助関数 > lib/invites/token.ts
import { describe, it, expect } from "vitest";
import {
  INVITE_EXPIRES_MS,
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  isExpired,
} from "@/lib/invites/token";

describe("invite token", () => {
  it("generateInviteToken は base64url 文字集合", () => {
    const t = generateInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(30);
  });

  it("生成 token は毎回異なる", () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken());
  });

  it("hashInviteToken は同じ input で安定", () => {
    expect(hashInviteToken("abc")).toBe(hashInviteToken("abc"));
  });

  it("hashInviteToken は SHA-256 hex (64 文字)", () => {
    expect(hashInviteToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashInviteToken は異なる token で異なる出力", () => {
    expect(hashInviteToken("abc")).not.toBe(hashInviteToken("abd"));
  });

  it("inviteExpiresAt は now + 7 日", () => {
    const now = new Date("2026-07-12T10:00:00.000Z");
    const exp = inviteExpiresAt(now);
    expect(exp.getTime() - now.getTime()).toBe(INVITE_EXPIRES_MS);
  });

  it("isExpired: expiresAt == now は expired (等号ちょうど)", () => {
    const now = new Date("2026-07-12T10:00:00.000Z");
    expect(isExpired(now, now)).toBe(true);
  });

  it("isExpired: expiresAt が過去 → true", () => {
    const now = new Date("2026-07-12T10:00:00.000Z");
    const past = new Date(now.getTime() - 1);
    expect(isExpired(past, now)).toBe(true);
  });

  it("isExpired: expiresAt が未来 → false", () => {
    const now = new Date("2026-07-12T10:00:00.000Z");
    const future = new Date(now.getTime() + 1000);
    expect(isExpired(future, now)).toBe(false);
  });
});
