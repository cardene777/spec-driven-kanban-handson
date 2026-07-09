import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repository/list", () => ({
  getList: vi.fn(),
  listLists: vi.fn(),
  createList: vi.fn(),
}));
vi.mock("@/lib/repository/card", () => ({
  listCards: vi.fn(),
  createCard: vi.fn(),
  getCard: vi.fn(),
  updateCard: vi.fn(),
}));

import { POST } from "@/app/api/lists/[id]/cards/route";
import { PATCH } from "@/app/api/cards/[id]/route";
import * as listRepo from "@/lib/repository/list";
import * as cardRepo from "@/lib/repository/card";

describe("POST /api/lists/[id]/cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 正常系: spec/03_card.md FR-003
  it("既存リストへ有効なタイトルなら 201 で作成する", async () => {
    vi.mocked(listRepo.getList).mockResolvedValue({
      id: "l1",
      title: "Todo",
      order: 0,
      boardId: "b1",
      createdAt: new Date(0),
    });
    vi.mocked(cardRepo.createCard).mockResolvedValue({
      id: "c1",
      title: "Task",
      description: null,
      order: 0,
      listId: "l1",
      createdAt: new Date(0),
    });

    const request = new Request("http://localhost/api/lists/l1/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task" }),
    });
    const res = await POST(request, { params: Promise.resolve({ id: "l1" }) });

    expect(res.status).toBe(201);
    expect(cardRepo.createCard).toHaveBeenCalledWith("l1", "Task");
  });

  // 異常系: spec/03_card.md E-003
  it("存在しないリストなら 404 NOT_FOUND", async () => {
    vi.mocked(listRepo.getList).mockResolvedValue(null);

    const request = new Request("http://localhost/api/lists/missing/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Task" }),
    });
    const res = await POST(request, {
      params: Promise.resolve({ id: "missing" }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(cardRepo.createCard).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/cards/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 異常系: spec/04_card_edit.md E-003
  it("存在しないカードなら 404 NOT_FOUND", async () => {
    vi.mocked(cardRepo.getCard).mockResolvedValue(null);

    const request = new Request("http://localhost/api/cards/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New" }),
    });
    const res = await PATCH(request, {
      params: Promise.resolve({ id: "missing" }),
    });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(cardRepo.updateCard).not.toHaveBeenCalled();
  });
});
