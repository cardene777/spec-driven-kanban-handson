// spec/004_card_edit.md FR-003、PATCH で title 以外の body を無視することを確認
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repository/cards", () => ({
  findCardById: vi.fn(),
  updateCardTitle: vi.fn(),
}));

import { findCardById, updateCardTitle } from "@/lib/repository/cards";
import { PATCH } from "@/app/api/cards/[id]/route";

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/cards/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/cards/[id]", () => {
  it("存在しない cardId は 404", async () => {
    vi.mocked(findCardById).mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ title: "x" }), params("nope"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("指定されたカードが見つかりません");
  });

  it("404 と 400 の同時成立で 404 を優先", async () => {
    vi.mocked(findCardById).mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ title: "" }), params("nope"));
    expect(res.status).toBe(404);
    expect(updateCardTitle).not.toHaveBeenCalled();
  });

  it("body に description / order / listId が入っていても title だけ更新する", async () => {
    vi.mocked(findCardById).mockResolvedValueOnce({ id: "c1" });
    vi.mocked(updateCardTitle).mockResolvedValueOnce({
      id: "c1",
      title: "new",
      description: null,
      order: 0,
      listId: "l1",
      createdAt: new Date(),
    });
    const res = await PATCH(
      makeRequest({
        title: "new",
        description: "should-ignore",
        order: 99,
        listId: "other-list",
      }),
      params("c1"),
    );
    expect(res.status).toBe(200);
    expect(updateCardTitle).toHaveBeenCalledWith("c1", "new");
    expect(updateCardTitle).toHaveBeenCalledTimes(1);
  });

  it("title が 201 文字だと 400", async () => {
    vi.mocked(findCardById).mockResolvedValueOnce({ id: "c1" });
    const res = await PATCH(
      makeRequest({ title: "a".repeat(201) }),
      params("c1"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("titleは1〜200文字で入力してください");
  });
});
