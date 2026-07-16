import { describe, it, expect } from "vitest";
import { parseBooleanQuery, splitCsv, splitKeywords } from "@/lib/search/params";

describe("parseBooleanQuery", () => {
  it("only 'true' is truthy", () => {
    expect(parseBooleanQuery("true")).toBe(true);
    expect(parseBooleanQuery("false")).toBe(false);
    expect(parseBooleanQuery("1")).toBe(false);
    expect(parseBooleanQuery("")).toBe(false);
    expect(parseBooleanQuery(undefined)).toBe(false);
  });
});

describe("splitCsv", () => {
  it("empty / undefined → []", () => {
    expect(splitCsv("")).toEqual([]);
    expect(splitCsv(undefined)).toEqual([]);
  });

  it("splits, trims, and dedupes", () => {
    expect(splitCsv("a,b,a")).toEqual(["a", "b"]);
    expect(splitCsv(" a , b ")).toEqual(["a", "b"]);
  });

  it("drops empty segments", () => {
    expect(splitCsv("a,,b,")).toEqual(["a", "b"]);
  });
});

describe("splitKeywords", () => {
  it("empty → []", () => {
    expect(splitKeywords("")).toEqual([]);
    expect(splitKeywords("   ")).toEqual([]);
  });

  it("splits on ASCII and full-width whitespace", () => {
    expect(splitKeywords("foo bar")).toEqual(["foo", "bar"]);
    expect(splitKeywords("foo\tbar\nbaz")).toEqual(["foo", "bar", "baz"]);
    expect(splitKeywords("foo　bar")).toEqual(["foo", "bar"]);
  });
});
