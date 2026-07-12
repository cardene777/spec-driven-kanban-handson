import { describe, it, expect } from "vitest";
import {
  parseCardCreate,
  parseCardUpdate,
  parseCardOrder,
} from "@/lib/schemas/cards";
import { ValidationError } from "@/lib/http/errors";

describe("parseCardCreate", () => {
  it("accepts 200 chars", () => {
    expect(parseCardCreate({ title: "a".repeat(200) })).toEqual({
      title: "a".repeat(200),
    });
  });
  it("rejects 201 chars", () => {
    expect(() => parseCardCreate({ title: "a".repeat(201) })).toThrow(
      ValidationError,
    );
  });
});

describe("parseCardUpdate", () => {
  it("accepts title only", () => {
    expect(parseCardUpdate({ title: "x" })).toEqual({ title: "x" });
  });
  it("accepts description only (including empty string)", () => {
    expect(parseCardUpdate({ description: "" })).toEqual({ description: "" });
  });
  it("both missing → no_updates", () => {
    try {
      parseCardUpdate({});
      throw new Error("expected");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields._).toBe("no_updates");
    }
  });
  it("description 2001 chars → too_long", () => {
    try {
      parseCardUpdate({ description: "a".repeat(2001) });
      throw new Error("expected");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.description).toBe("too_long");
    }
  });
  it("description does not trim (leading spaces preserved)", () => {
    expect(parseCardUpdate({ description: "   hello   " })).toEqual({
      description: "   hello   ",
    });
  });
});

describe("parseCardOrder", () => {
  it("passes through toListId and toIndex without runtime checks", () => {
    expect(parseCardOrder({ toListId: "L1", toIndex: 2 })).toEqual({
      toListId: "L1",
      toIndex: 2,
    });
  });
});
