import { describe, it, expect } from "vitest";
import { canDeleteComment } from "@/lib/auth/canDeleteComment";

describe("canDeleteComment", () => {
  describe("owner", () => {
    it("owner can delete own comment", () => {
      expect(
        canDeleteComment({
          actorId: "u1",
          authorId: "u1",
          actorRole: "owner",
        }),
      ).toBe(true);
    });

    it("owner can delete other user's comment", () => {
      expect(
        canDeleteComment({
          actorId: "u1",
          authorId: "u2",
          actorRole: "owner",
        }),
      ).toBe(true);
    });
  });

  describe("member", () => {
    it("member can delete own comment", () => {
      expect(
        canDeleteComment({
          actorId: "u1",
          authorId: "u1",
          actorRole: "member",
        }),
      ).toBe(true);
    });

    it("member cannot delete other user's comment", () => {
      expect(
        canDeleteComment({
          actorId: "u1",
          authorId: "u2",
          actorRole: "member",
        }),
      ).toBe(false);
    });
  });

  describe("viewer", () => {
    it("viewer cannot delete own comment", () => {
      expect(
        canDeleteComment({
          actorId: "u1",
          authorId: "u1",
          actorRole: "viewer",
        }),
      ).toBe(false);
    });

    it("viewer cannot delete other user's comment", () => {
      expect(
        canDeleteComment({
          actorId: "u1",
          authorId: "u2",
          actorRole: "viewer",
        }),
      ).toBe(false);
    });
  });
});
