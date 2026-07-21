// spec/011_auth.md § バリデーション / 非機能要件
// 純粋関数（DB・モック不要）の単体テスト。4軸のうち正常系・異常系・境界条件を担当する。
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/token";
import { isValidEmail, isValidPassword, isValidName } from "@/lib/validation/auth";

describe("password hashing — 正常系", () => {
  it("ハッシュ化した値で正しいパスワードを検証できる", () => {
    const stored = hashPassword("password1");
    expect(verifyPassword("password1", stored)).toBe(true);
  });

  it("保存形式は scrypt$<salt>$<hash>", () => {
    const stored = hashPassword("password1");
    const parts = stored.split("$");
    expect(parts[0]).toBe("scrypt");
    expect(parts).toHaveLength(3);
  });

  it("同一パスワードでも毎回異なるハッシュになる（ソルト）", () => {
    expect(hashPassword("password1")).not.toBe(hashPassword("password1"));
  });
});

describe("password hashing — 異常系（認証失敗）", () => {
  it("誤ったパスワードは false", () => {
    const stored = hashPassword("password1");
    expect(verifyPassword("password2", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("壊れた保存値・別形式の保存値は false（例外を投げない）", () => {
    expect(verifyPassword("password1", "")).toBe(false);
    expect(verifyPassword("password1", "plaintext")).toBe(false);
    expect(verifyPassword("password1", "scrypt$abc")).toBe(false);
    expect(verifyPassword("password1", "bcrypt$aa$bb")).toBe(false);
    expect(verifyPassword("password1", "scrypt$zz$zz")).toBe(false);
  });
});

describe("token generation — 正常系・境界条件", () => {
  it("32文字以上のトークンを生成する（CSPRNG 32バイト）", () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(32);
  });

  it("2回生成すると一致しない", () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it("URL-safe な文字のみで構成される", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("email validation — 正常系・異常系・境界条件", () => {
  it("正しい形式は妥当", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("user.name+tag@example.com")).toBe(true);
  });

  it("トップレベルドメインなし（a@b）は不正", () => {
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("@なし・空白入り・空文字・非文字列は不正", () => {
    expect(isValidEmail("ab.co")).toBe(false);
    expect(isValidEmail("a b@c.co")).toBe(false);
    expect(isValidEmail("a@ b.co")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });
});

describe("password validation — 境界条件", () => {
  it("7文字は不正、8文字は妥当（下限）", () => {
    expect(isValidPassword("passwd1")).toBe(false);
    expect(isValidPassword("passwor1")).toBe(true);
  });

  it("72文字は妥当、73文字は不正（上限）", () => {
    const base = (n: number) => "a".repeat(n - 1) + "1";
    expect(isValidPassword(base(72))).toBe(true);
    expect(isValidPassword(base(73))).toBe(false);
  });

  it("英字のみ・数字のみ・記号のみは不正（文字種）", () => {
    expect(isValidPassword("abcdefgh")).toBe(false);
    expect(isValidPassword("12345678")).toBe(false);
    expect(isValidPassword("!@#$%^&*")).toBe(false);
  });

  it("記号を含んでも英字と数字があれば妥当", () => {
    expect(isValidPassword("pass!word1")).toBe(true);
  });

  it("非文字列は不正", () => {
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(12345678)).toBe(false);
  });
});

describe("name validation — 境界条件", () => {
  it("0文字は不正、1文字は妥当（下限）", () => {
    expect(isValidName("")).toBe(false);
    expect(isValidName("a")).toBe(true);
  });

  it("50文字は妥当、51文字は不正（上限）", () => {
    expect(isValidName("a".repeat(50))).toBe(true);
    expect(isValidName("a".repeat(51))).toBe(false);
  });

  it("空白のみは不正（trim 後に判定）", () => {
    expect(isValidName("   ")).toBe(false);
    expect(isValidName("　")).toBe(false);
    expect(isValidName("  a  ")).toBe(true);
  });

  it("非文字列は不正", () => {
    expect(isValidName(null)).toBe(false);
    expect(isValidName(42)).toBe(false);
  });
});
