// spec/013_permissions.md § バリデーション SSOT
import { describe, it, expect } from "vitest";
import { parseRoleUpdate } from "@/lib/schemas/members";
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

describe("parseRoleUpdate", () => {
  it("owner / member / viewer を受理", () => {
    expect(parseRoleUpdate({ role: "owner" })).toEqual({ role: "owner" });
    expect(parseRoleUpdate({ role: "member" })).toEqual({ role: "member" });
    expect(parseRoleUpdate({ role: "viewer" })).toEqual({ role: "viewer" });
  });

  it("role 未指定 → required", () => {
    expectFieldError(() => parseRoleUpdate({}), "role", "required");
  });

  it("role 数値 → invalid_type", () => {
    expectFieldError(
      () => parseRoleUpdate({ role: 1 }),
      "role",
      "invalid_type",
    );
  });

  it("role: admin → invalid_value", () => {
    expectFieldError(
      () => parseRoleUpdate({ role: "admin" }),
      "role",
      "invalid_value",
    );
  });

  it("role: OWNER (大文字) → invalid_value", () => {
    expectFieldError(
      () => parseRoleUpdate({ role: "OWNER" }),
      "role",
      "invalid_value",
    );
  });
});
