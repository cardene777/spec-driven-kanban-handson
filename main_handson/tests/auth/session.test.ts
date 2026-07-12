// design/011_auth.md § session ユーティリティ
import { describe, it, expect } from "vitest";
import {
  buildLogoutCookie,
  buildSessionCookie,
  generateSessionId,
  sessionIdPrefix,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

describe("session cookie", () => {
  it("buildSessionCookie dev では Secure を付けない", () => {
    const c = buildSessionCookie("abc123", "development");
    expect(c).toContain(`${SESSION_COOKIE_NAME}=abc123`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    expect(c).not.toContain("Secure");
  });

  it("buildSessionCookie production では Secure を付ける", () => {
    const c = buildSessionCookie("abc123", "production");
    expect(c).toContain("Secure");
  });

  it("buildLogoutCookie は Max-Age=0", () => {
    const c = buildLogoutCookie("development");
    expect(c).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(c).toContain("Max-Age=0");
    expect(c).not.toContain("Secure");
  });

  it("generateSessionId は base64url 文字集合", () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(id.length).toBeGreaterThanOrEqual(40);
  });

  it("generateSessionId は毎回異なる", () => {
    const a = generateSessionId();
    const b = generateSessionId();
    expect(a).not.toBe(b);
  });

  it("sessionIdPrefix は 8 文字", () => {
    expect(sessionIdPrefix("abcdefghijklmnop")).toBe("abcdefgh");
  });
});
