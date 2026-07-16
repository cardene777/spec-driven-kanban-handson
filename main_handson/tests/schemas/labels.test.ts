import { describe, it, expect } from "vitest";
import { parseLabelCreate, parseLabelUpdate } from "@/lib/schemas/labels";
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

describe("parseLabelCreate", () => {
  it("accepts a valid name + color", () => {
    expect(parseLabelCreate({ name: "urgent", color: "red" })).toEqual({
      name: "urgent",
      color: "red",
    });
  });

  it("trims the name", () => {
    expect(parseLabelCreate({ name: "  bug ", color: "blue" })).toEqual({
      name: "bug",
      color: "blue",
    });
  });

  it("accepts a 1-char name (lower bound)", () => {
    expect(parseLabelCreate({ name: "a", color: "green" }).name).toBe("a");
  });

  it("accepts a 50-char name (upper bound)", () => {
    const n = "a".repeat(50);
    expect(parseLabelCreate({ name: n, color: "green" }).name).toBe(n);
  });

  it("name missing → 422 required", () => {
    expectField(() => parseLabelCreate({ color: "red" }), "name", "required");
  });

  it("name empty / whitespace-only → 422 required", () => {
    expectField(() => parseLabelCreate({ name: "", color: "red" }), "name", "required");
    expectField(() => parseLabelCreate({ name: "   ", color: "red" }), "name", "required");
  });

  it("name 51 chars → 422 too_long", () => {
    expectField(
      () => parseLabelCreate({ name: "a".repeat(51), color: "red" }),
      "name",
      "too_long",
    );
  });

  it("name non-string → 422 invalid_type", () => {
    expectField(() => parseLabelCreate({ name: 1, color: "red" }), "name", "invalid_type");
  });

  it("color missing → 422 required", () => {
    expectField(() => parseLabelCreate({ name: "x" }), "color", "required");
  });

  it("color outside palette → 422 invalid_color", () => {
    expectField(() => parseLabelCreate({ name: "x", color: "black" }), "color", "invalid_color");
    expectField(() => parseLabelCreate({ name: "x", color: "RED" }), "color", "invalid_color");
  });

  it("color non-string → 422 invalid_type", () => {
    expectField(() => parseLabelCreate({ name: "x", color: 1 }), "color", "invalid_type");
  });

  it("rejects extra fields (strict)", () => {
    expect(() => parseLabelCreate({ name: "x", color: "red", extra: 1 })).toThrow(
      ValidationError,
    );
  });
});

describe("parseLabelUpdate", () => {
  it("accepts name only", () => {
    expect(parseLabelUpdate({ name: "new" })).toEqual({ name: "new" });
  });

  it("accepts color only", () => {
    expect(parseLabelUpdate({ color: "pink" })).toEqual({ color: "pink" });
  });

  it("accepts both", () => {
    expect(parseLabelUpdate({ name: "n", color: "gray" })).toEqual({
      name: "n",
      color: "gray",
    });
  });

  it("both missing → 422 no_updates", () => {
    expectField(() => parseLabelUpdate({}), "_", "no_updates");
  });

  it("invalid color on update → 422 invalid_color", () => {
    expectField(() => parseLabelUpdate({ color: "black" }), "color", "invalid_color");
  });

  it("too-long name on update → 422 too_long", () => {
    expectField(() => parseLabelUpdate({ name: "a".repeat(51) }), "name", "too_long");
  });
});
