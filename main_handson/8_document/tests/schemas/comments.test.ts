import { describe, it, expect } from "vitest";
import { parseCommentCreate } from "@/lib/schemas/comments";
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

describe("parseCommentCreate", () => {
  describe("正常系", () => {
    it("accepts 1 char (下限ちょうど)", () => {
      expect(parseCommentCreate({ body: "a" })).toEqual({ body: "a" });
    });

    it("accepts 2000 chars (上限ちょうど)", () => {
      const body = "a".repeat(2000);
      expect(parseCommentCreate({ body })).toEqual({ body });
    });

    it("does not trim (leading/trailing spaces preserved)", () => {
      expect(parseCommentCreate({ body: "  hi  " })).toEqual({ body: "  hi  " });
    });

    it("preserves inner consecutive whitespace", () => {
      expect(parseCommentCreate({ body: "a   b" })).toEqual({ body: "a   b" });
    });

    it("accepts multibyte body", () => {
      expect(parseCommentCreate({ body: "コメント本文" })).toEqual({
        body: "コメント本文",
      });
    });
  });

  describe("バリデーション異常系", () => {
    it("body missing → 422 required", () => {
      expectFieldError(() => parseCommentCreate({}), "body", "required");
    });

    it("body empty string → 422 required", () => {
      expectFieldError(() => parseCommentCreate({ body: "" }), "body", "required");
    });

    it("body whitespace only → 422 required", () => {
      expectFieldError(
        () => parseCommentCreate({ body: "   " }),
        "body",
        "required",
      );
    });

    it("body number → 422 invalid_type", () => {
      expectFieldError(
        () => parseCommentCreate({ body: 123 }),
        "body",
        "invalid_type",
      );
    });

    it("body null → 422 invalid_type", () => {
      expectFieldError(
        () => parseCommentCreate({ body: null }),
        "body",
        "invalid_type",
      );
    });

    it("body 2001 chars → 422 too_long", () => {
      expectFieldError(
        () => parseCommentCreate({ body: "a".repeat(2001) }),
        "body",
        "too_long",
      );
    });

    it("rejects extra fields (strict schema)", () => {
      expect(() =>
        parseCommentCreate({ body: "a", extra: "x" }),
      ).toThrow(ValidationError);
    });
  });

  describe("境界条件", () => {
    it("tab-only body → 422 required", () => {
      expectFieldError(
        () => parseCommentCreate({ body: "\t\t\t" }),
        "body",
        "required",
      );
    });

    it("newline-only body → 422 required", () => {
      expectFieldError(
        () => parseCommentCreate({ body: "\n\n" }),
        "body",
        "required",
      );
    });

    it("body length judged on raw input (2000 chars of '<' still accepted)", () => {
      const body = "<".repeat(2000);
      expect(parseCommentCreate({ body })).toEqual({ body });
    });
  });
});
