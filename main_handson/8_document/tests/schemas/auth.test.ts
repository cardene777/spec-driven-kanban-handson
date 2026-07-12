// spec/011_auth.md § バリデーション SSOT
import { describe, it, expect } from "vitest";
import { parseSignup, parseLogin } from "@/lib/schemas/auth";
import { ValidationError } from "@/lib/http/errors";

function expectFieldError(fn: () => unknown, key: string, message: string) {
  try {
    fn();
    throw new Error("expected ValidationError");
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields[key]).toBe(message);
  }
}

describe("parseSignup", () => {
  it("正常系は 3 field を受理", () => {
    expect(
      parseSignup({
        email: "u@example.com",
        password: "Abc123!!",
        name: "User",
      }),
    ).toEqual({
      email: "u@example.com",
      password: "Abc123!!",
      name: "User",
    });
  });

  it("email 空 → required", () => {
    expectFieldError(
      () => parseSignup({ email: "", password: "Abc123!!", name: "U" }),
      "email",
      "required",
    );
  });

  it("email 不正形式 → invalid_format", () => {
    expectFieldError(
      () => parseSignup({ email: "not-mail", password: "Abc123!!", name: "U" }),
      "email",
      "invalid_format",
    );
  });

  it("password 7 文字 → too_short", () => {
    expectFieldError(
      () => parseSignup({ email: "u@e.com", password: "Abc12!", name: "U" }),
      "password",
      "too_short",
    );
  });

  it("password 3 種混在なし → weak", () => {
    expectFieldError(
      () => parseSignup({ email: "u@e.com", password: "abcdefgh", name: "U" }),
      "password",
      "weak",
    );
  });

  it("name 101 文字 → too_long", () => {
    expectFieldError(
      () =>
        parseSignup({
          email: "u@e.com",
          password: "Abc123!!",
          name: "a".repeat(101),
        }),
      "name",
      "too_long",
    );
  });

  it("name トリム後 0 文字 → required", () => {
    expectFieldError(
      () =>
        parseSignup({ email: "u@e.com", password: "Abc123!!", name: "   " }),
      "name",
      "required",
    );
  });

  it("email number → invalid_type", () => {
    expectFieldError(
      () => parseSignup({ email: 1, password: "Abc123!!", name: "U" }),
      "email",
      "invalid_type",
    );
  });

  it("password null → required", () => {
    expectFieldError(
      () => parseSignup({ email: "u@e.com", password: null, name: "U" }),
      "password",
      "required",
    );
  });
});

describe("parseLogin", () => {
  it("正常系", () => {
    expect(parseLogin({ email: "u@e.com", password: "anything" })).toEqual({
      email: "u@e.com",
      password: "anything",
    });
  });

  it("email 空 → required", () => {
    expectFieldError(
      () => parseLogin({ email: "", password: "x" }),
      "email",
      "required",
    );
  });

  it("password 空 → required", () => {
    expectFieldError(
      () => parseLogin({ email: "u@e.com", password: "" }),
      "password",
      "required",
    );
  });

  it("ログイン時は email 形式 / password 強度を検証しない", () => {
    expect(parseLogin({ email: "not-mail", password: "abc" })).toEqual({
      email: "not-mail",
      password: "abc",
    });
  });
});
