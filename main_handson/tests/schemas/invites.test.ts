// spec/012_member_invite.md § バリデーション SSOT
import { describe, it, expect } from "vitest";
import { parseInviteCreate } from "@/lib/schemas/invites";
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

describe("parseInviteCreate", () => {
  it("member を受理し email を小文字化", () => {
    expect(
      parseInviteCreate({ email: "USER@Example.com", role: "member" }),
    ).toEqual({ email: "user@example.com", role: "member" });
  });

  it("viewer を受理", () => {
    expect(
      parseInviteCreate({ email: "u@example.com", role: "viewer" }),
    ).toEqual({ email: "u@example.com", role: "viewer" });
  });

  it("role: owner は invalid_value", () => {
    expectFieldError(
      () => parseInviteCreate({ email: "u@e.com", role: "owner" }),
      "role",
      "invalid_value",
    );
  });

  it("role: admin は invalid_value", () => {
    expectFieldError(
      () => parseInviteCreate({ email: "u@e.com", role: "admin" }),
      "role",
      "invalid_value",
    );
  });

  it("email 空 → required", () => {
    expectFieldError(
      () => parseInviteCreate({ email: "", role: "member" }),
      "email",
      "required",
    );
  });

  it("email 不正形式 → invalid_format", () => {
    expectFieldError(
      () => parseInviteCreate({ email: "no-at", role: "member" }),
      "email",
      "invalid_format",
    );
  });

  it("role 未指定 → required", () => {
    expectFieldError(
      () => parseInviteCreate({ email: "u@e.com" }),
      "role",
      "required",
    );
  });

  it("email 数値 → invalid_type", () => {
    expectFieldError(
      () => parseInviteCreate({ email: 1, role: "member" }),
      "email",
      "invalid_type",
    );
  });
});
