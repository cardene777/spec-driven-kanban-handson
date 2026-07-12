// design/011_auth.md § 実装方針 (scrypt によるパスワードハッシュ)
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/passwordHash";

describe("password hash (scrypt)", () => {
  it("hash はプレフィックス s2$ を含む", () => {
    const h = hashPassword("Abc123!!");
    expect(h.startsWith("s2$")).toBe(true);
  });

  it("同じパスワードでも salt が異なるので hash は毎回異なる", () => {
    const a = hashPassword("Abc123!!");
    const b = hashPassword("Abc123!!");
    expect(a).not.toBe(b);
  });

  it("正しいパスワードは verify で true", () => {
    const h = hashPassword("Abc123!!");
    expect(verifyPassword("Abc123!!", h)).toBe(true);
  });

  it("誤ったパスワードは verify で false", () => {
    const h = hashPassword("Abc123!!");
    expect(verifyPassword("xyz", h)).toBe(false);
  });

  it("壊れた format は false を返す", () => {
    expect(verifyPassword("Abc123!!", "not-hash")).toBe(false);
    expect(verifyPassword("Abc123!!", "s2$badformat")).toBe(false);
  });
});
