import { describe, it, expect } from "vitest";
import { parseDueDateUpdate } from "@/lib/schemas/dueDate";
import { ValidationError } from "@/lib/http/errors";

function expectField(fn: () => unknown, key: string, message: string) {
  try {
    fn();
    throw new Error("expected ValidationError");
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields[key]).toBe(message);
  }
}

describe("parseDueDateUpdate", () => {
  it("accepts a valid YYYY-MM-DD", () => {
    expect(parseDueDateUpdate({ dueDate: "2026-07-12" })).toEqual({
      dueDate: "2026-07-12",
    });
  });

  it("accepts null (unset)", () => {
    expect(parseDueDateUpdate({ dueDate: null })).toEqual({ dueDate: null });
  });

  it("accepts past and far-future dates", () => {
    expect(parseDueDateUpdate({ dueDate: "1970-01-01" }).dueDate).toBe("1970-01-01");
    expect(parseDueDateUpdate({ dueDate: "9999-12-31" }).dueDate).toBe("9999-12-31");
  });

  it("missing field → 422 required", () => {
    expectField(() => parseDueDateUpdate({}), "dueDate", "required");
  });

  it("bad format → 422 invalid_format", () => {
    expectField(() => parseDueDateUpdate({ dueDate: "2026/07/12" }), "dueDate", "invalid_format");
    expectField(() => parseDueDateUpdate({ dueDate: "2026-7-12" }), "dueDate", "invalid_format");
    expectField(() => parseDueDateUpdate({ dueDate: "" }), "dueDate", "invalid_format");
  });

  it("impossible date → 422 invalid_date", () => {
    expectField(() => parseDueDateUpdate({ dueDate: "2026-02-30" }), "dueDate", "invalid_date");
    expectField(() => parseDueDateUpdate({ dueDate: "2026-13-01" }), "dueDate", "invalid_date");
  });

  it("non-string non-null → 422 invalid_type", () => {
    expectField(() => parseDueDateUpdate({ dueDate: 20260712 }), "dueDate", "invalid_type");
    expectField(() => parseDueDateUpdate({ dueDate: true }), "dueDate", "invalid_type");
  });

  it("rejects extra fields (strict)", () => {
    expect(() => parseDueDateUpdate({ dueDate: null, extra: 1 })).toThrow(ValidationError);
  });
});
