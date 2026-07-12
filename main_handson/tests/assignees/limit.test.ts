import { describe, it, expect } from "vitest";
import {
  ASSIGNEES_MAX,
  assertBelowLimit,
} from "@/lib/assignees/limit";
import { ValidationError } from "@/lib/http/errors";

function expectLimitExceeded(fn: () => void) {
  try {
    fn();
    throw new Error("expected ValidationError");
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).fields.userId).toBe(
      "assignees_limit_exceeded",
    );
  }
}

describe("ASSIGNEES_MAX", () => {
  it("is fixed to 10 (spec/009_assignee.md § 境界条件)", () => {
    expect(ASSIGNEES_MAX).toBe(10);
  });
});

describe("assertBelowLimit", () => {
  it("count=0 → does not throw", () => {
    expect(() => assertBelowLimit(0)).not.toThrow();
  });

  it("count=5 → does not throw", () => {
    expect(() => assertBelowLimit(5)).not.toThrow();
  });

  it("count=9 (boundary, still below 10) → does not throw", () => {
    expect(() => assertBelowLimit(9)).not.toThrow();
  });

  it("count=10 (at limit) → throws assignees_limit_exceeded", () => {
    try {
      assertBelowLimit(10);
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe(
        "assignees_limit_exceeded",
      );
    }
  });

  it("count=11 (over limit) → throws assignees_limit_exceeded", () => {
    try {
      assertBelowLimit(11);
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fields.userId).toBe(
        "assignees_limit_exceeded",
      );
    }
  });

  describe("正常系", () => {
    // spec/009 § 受入条件: 担当者 0 人 → 1 人目 追加 201、9 人 → 10 人目 追加 201
    it.each([1, 2, 3, 4, 6, 7, 8])(
      "count=%i (below limit) → does not throw",
      (count) => {
        expect(() => assertBelowLimit(count)).not.toThrow();
      },
    );

    it("count=ASSIGNEES_MAX-1 (constant-driven boundary) → does not throw", () => {
      expect(() => assertBelowLimit(ASSIGNEES_MAX - 1)).not.toThrow();
    });
  });

  describe("異常系", () => {
    // spec/009 § 受入条件: 10 人 → 11 人目 追加 422 assignees_limit_exceeded
    it.each([12, 15, 100, 1000])(
      "count=%i (well over limit) → throws assignees_limit_exceeded",
      (count) => {
        expectLimitExceeded(() => assertBelowLimit(count));
      },
    );

    it("error carries userId field only (single-field ValidationError)", () => {
      try {
        assertBelowLimit(ASSIGNEES_MAX);
        throw new Error("expected ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const fields = (err as ValidationError).fields;
        expect(Object.keys(fields)).toEqual(["userId"]);
        expect(fields.userId).toBe("assignees_limit_exceeded");
      }
    });
  });

  describe("境界条件", () => {
    it("count=ASSIGNEES_MAX (constant-driven at limit) → throws", () => {
      expectLimitExceeded(() => assertBelowLimit(ASSIGNEES_MAX));
    });

    it("count=ASSIGNEES_MAX+1 (constant-driven over limit) → throws", () => {
      expectLimitExceeded(() => assertBelowLimit(ASSIGNEES_MAX + 1));
    });

    it("adjacent boundary pair: 9 passes, 10 throws", () => {
      expect(() => assertBelowLimit(ASSIGNEES_MAX - 1)).not.toThrow();
      expectLimitExceeded(() => assertBelowLimit(ASSIGNEES_MAX));
    });
  });

  describe("状態遷移", () => {
    // spec/009 § 境界条件 § 追加時の重複判定:
    // 「割当を解除した直後 (DELETE 直後) に同一 userId を POST: 受け付ける」
    // 上限判定 pure 関数レベルでは count の遷移として観測する。
    it("count 0→10 の逐次追加は全て通過し、11 人目相当で拒否される", () => {
      for (let count = 0; count < ASSIGNEES_MAX; count++) {
        expect(() => assertBelowLimit(count)).not.toThrow();
      }
      expectLimitExceeded(() => assertBelowLimit(ASSIGNEES_MAX));
    });

    it("上限到達後、DELETE で count が減れば再度追加を受け付ける", () => {
      // 10 名到達 → 追加拒否
      expectLimitExceeded(() => assertBelowLimit(ASSIGNEES_MAX));
      // 1 名 DELETE → 9 名 → 追加受入
      const afterDelete = ASSIGNEES_MAX - 1;
      expect(() => assertBelowLimit(afterDelete)).not.toThrow();
    });

    it("上限到達後、複数削除で count がさらに減っても常に受け付ける", () => {
      expectLimitExceeded(() => assertBelowLimit(ASSIGNEES_MAX));
      for (let removed = 1; removed <= ASSIGNEES_MAX; removed++) {
        const remaining = ASSIGNEES_MAX - removed;
        expect(() => assertBelowLimit(remaining)).not.toThrow();
      }
    });
  });
});
