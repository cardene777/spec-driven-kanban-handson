import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/comments/escape";

describe("escapeHtml", () => {
  it("escapes '&' first to avoid double-encoding new entities", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });

  it("escapes '<'", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("escapes '>'", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it('escapes double quote', () => {
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes single quote", () => {
    expect(escapeHtml("'")).toBe("&#39;");
  });

  it("escapes a script tag payload", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("keeps normal text as is", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("keeps multibyte characters as is", () => {
    expect(escapeHtml("こんにちは")).toBe("こんにちは");
  });

  it("keeps emoji as is", () => {
    expect(escapeHtml("🎉")).toBe("🎉");
  });

  it("preserves whitespace (leading/trailing/inner)", () => {
    expect(escapeHtml("  a   b  ")).toBe("  a   b  ");
  });

  it("double-escapes when called twice (caller is responsible for calling once)", () => {
    expect(escapeHtml(escapeHtml("&"))).toBe("&amp;amp;");
  });

  it("handles mixed content in a single pass", () => {
    expect(escapeHtml(`a<b>c&d"e'f`)).toBe("a&lt;b&gt;c&amp;d&quot;e&#39;f");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });
});
