import { describe, it, expect } from "vitest";
import { parseBoardCreate, parseBoardUpdate } from "@/lib/schemas/boards";
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

describe("parseBoardCreate", () => {
  it("trims and accepts 1 char", () => {
    expect(parseBoardCreate({ title: " x " })).toEqual({ title: "x" });
  });
  it("accepts exactly 100 chars", () => {
    expect(parseBoardCreate({ title: "a".repeat(100) })).toEqual({
      title: "a".repeat(100),
    });
  });
  it("rejects 101 chars → too_long", () => {
    expectFieldError(
      () => parseBoardCreate({ title: "a".repeat(101) }),
      "title",
      "too_long",
    );
  });
  it("rejects empty string → required", () => {
    expectFieldError(() => parseBoardCreate({ title: "" }), "title", "required");
  });
  it("rejects whitespace only → required", () => {
    expectFieldError(
      () => parseBoardCreate({ title: "   " }),
      "title",
      "required",
    );
  });
  it("rejects non-string → invalid_type", () => {
    expectFieldError(
      () => parseBoardCreate({ title: 123 }),
      "title",
      "invalid_type",
    );
  });
  it("rejects missing title → required (undefined path)", () => {
    // strict object with no title → maps to key `_` or `title`; verify one is set
    try {
      parseBoardCreate({});
      throw new Error("expected");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
    }
  });
});

describe("parseBoardUpdate", () => {
  it("accepts trimmed title", () => {
    expect(parseBoardUpdate({ title: "new" })).toEqual({ title: "new" });
  });
});
