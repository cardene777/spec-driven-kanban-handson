import { describe, it, expect } from "vitest";
import { LABEL_COLORS, isLabelColor } from "@/lib/labels/colors";

describe("LABEL_COLORS", () => {
  it("has the 8 predefined colors in spec order", () => {
    expect(LABEL_COLORS).toEqual([
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink",
      "gray",
    ]);
  });
});

describe("isLabelColor", () => {
  it("accepts each of the 8 colors", () => {
    for (const c of LABEL_COLORS) expect(isLabelColor(c)).toBe(true);
  });

  it("rejects uppercase (enum is lowercase only)", () => {
    expect(isLabelColor("RED")).toBe(false);
  });

  it("rejects a color outside the palette", () => {
    expect(isLabelColor("black")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isLabelColor(1)).toBe(false);
    expect(isLabelColor(null)).toBe(false);
    expect(isLabelColor(undefined)).toBe(false);
  });
});
