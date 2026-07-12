import { describe, it, expect } from "vitest";
import { parseAssigneeCreate } from "@/lib/schemas/assignees";
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

describe("parseAssigneeCreate", () => {
  it("accepts a valid userId string", () => {
    expect(parseAssigneeCreate({ userId: "u1" })).toEqual({ userId: "u1" });
  });

  it("body missing userId → 422 required", () => {
    try {
      parseAssigneeCreate({});
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe("required");
    }
  });

  it("userId is empty string → 422 required", () => {
    try {
      parseAssigneeCreate({ userId: "" });
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe("required");
    }
  });

  it("userId is whitespace-only → 422 required", () => {
    try {
      parseAssigneeCreate({ userId: "   " });
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe("required");
    }
  });

  it("userId is number → 422 invalid_type", () => {
    try {
      parseAssigneeCreate({ userId: 123 });
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe("invalid_type");
    }
  });

  it("userId is null → 422 invalid_type", () => {
    try {
      parseAssigneeCreate({ userId: null });
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe("invalid_type");
    }
  });

  it("rejects extra fields (strict schema)", () => {
    try {
      parseAssigneeCreate({ userId: "u1", extra: "x" });
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
    }
  });

  describe("正常系", () => {
    it("trims leading whitespace", () => {
      expect(parseAssigneeCreate({ userId: "   u1" })).toEqual({ userId: "u1" });
    });

    it("trims trailing whitespace", () => {
      expect(parseAssigneeCreate({ userId: "u1   " })).toEqual({ userId: "u1" });
    });

    it("trims whitespace on both sides", () => {
      expect(parseAssigneeCreate({ userId: "  u1  " })).toEqual({
        userId: "u1",
      });
    });

    it("accepts a single-character userId", () => {
      expect(parseAssigneeCreate({ userId: "a" })).toEqual({ userId: "a" });
    });

    it("accepts a UUID-like userId", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(parseAssigneeCreate({ userId: uuid })).toEqual({ userId: uuid });
    });

    it("accepts multibyte userId (spec does not restrict charset)", () => {
      expect(parseAssigneeCreate({ userId: "田中太郎" })).toEqual({
        userId: "田中太郎",
      });
    });
  });

  describe("異常系", () => {
    it("userId is boolean true → 422 invalid_type", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: true }),
        "userId",
        "invalid_type",
      );
    });

    it("userId is boolean false → 422 invalid_type", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: false }),
        "userId",
        "invalid_type",
      );
    });

    it("userId is array → 422 invalid_type", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: ["u1"] }),
        "userId",
        "invalid_type",
      );
    });

    it("userId is nested object → 422 invalid_type", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: { value: "u1" } }),
        "userId",
        "invalid_type",
      );
    });

    it("rejects extra fields even without userId", () => {
      try {
        parseAssigneeCreate({ extra: "x" });
        throw new Error("expected ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
      }
    });

    it("rejects null body", () => {
      expect(() => parseAssigneeCreate(null)).toThrow(ValidationError);
    });

    it("rejects array body", () => {
      expect(() => parseAssigneeCreate([])).toThrow(ValidationError);
    });

    it("rejects string body", () => {
      expect(() => parseAssigneeCreate("u1")).toThrow(ValidationError);
    });
  });

  describe("境界条件", () => {
    it("tab-only userId → 422 required", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: "\t\t\t" }),
        "userId",
        "required",
      );
    });

    it("newline-only userId → 422 required", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: "\n\n" }),
        "userId",
        "required",
      );
    });

    it("mixed whitespace (space/tab/newline) → 422 required", () => {
      expectFieldError(
        () => parseAssigneeCreate({ userId: " \t\n " }),
        "userId",
        "required",
      );
    });

    it("userId with inner whitespace preserved after trim", () => {
      expect(parseAssigneeCreate({ userId: "  u 1  " })).toEqual({
        userId: "u 1",
      });
    });

    it("accepts a very long userId (spec has no upper bound)", () => {
      const long = "a".repeat(256);
      expect(parseAssigneeCreate({ userId: long })).toEqual({ userId: long });
    });

    it("userId '0' is a valid non-empty string", () => {
      expect(parseAssigneeCreate({ userId: "0" })).toEqual({ userId: "0" });
    });
  });
});
