// spec/011_auth.md § バリデーション / § 境界条件 § password の強度
import { describe, it, expect } from "vitest";
import {
  checkPassword,
  isPasswordStrong,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/passwordStrength";

describe("checkPassword", () => {
  it("7 文字は too_short", () => {
    expect(checkPassword("Abc12!")).toBe("too_short");
  });

  it("8 文字ちょうど + 3 種混在は OK", () => {
    expect(checkPassword("Abc123!!")).toBeNull();
    expect(isPasswordStrong("Abc123!!")).toBe(true);
  });

  it("英字のみ (8 文字以上) は weak", () => {
    expect(checkPassword("abcdefgh")).toBe("weak");
  });

  it("英数字だが記号なしは weak", () => {
    expect(checkPassword("Abcdefg1")).toBe("weak");
  });

  it("数字と記号だが英字なしは weak", () => {
    expect(checkPassword("12345!!!")).toBe("weak");
  });

  it("英字と記号だが数字なしは weak", () => {
    expect(checkPassword("abc!!!!!")).toBe("weak");
  });

  it("201 文字以上は too_long", () => {
    const p = "Aa1!" + "a".repeat(197);
    expect(p.length).toBe(201);
    expect(checkPassword(p)).toBe("too_long");
  });

  it("MIN_PASSWORD_LENGTH は 8", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});
