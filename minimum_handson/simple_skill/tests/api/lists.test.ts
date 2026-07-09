import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repository/board", () => ({
  getBoard: vi.fn(),
  listBoards: vi.fn(),
  createBoard: vi.fn(),
}));
vi.mock("@/lib/repository/list", () => ({
  listLists: vi.fn(),
  createList: vi.fn(),
  getList: vi.fn(),
}));

import { POST } from "@/app/api/boards/[id]/lists/route";
import * as boardRepo from "@/lib/repository/board";
import * as listRepo from "@/lib/repository/list";

function postRequest(boardId: string, body: unknown) {
  return {
    request: new Request(`http://localhost/api/boards/${boardId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    context: { params: Promise.resolve({ id: boardId }) },
  };
}

describe("POST /api/boards/[id]/lists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 正常系: spec/02_list.md FR-003
  it("既存ボードへ有効なタイトルなら 201 で作成する", async () => {
    vi.mocked(boardRepo.getBoard).mockResolvedValue({
      id: "b1",
      title: "Board",
      createdAt: new Date(0),
    });
    vi.mocked(listRepo.createList).mockResolvedValue({
      id: "l1",
      title: "Todo",
      order: 0,
      boardId: "b1",
      createdAt: new Date(0),
    });

    const { request, context } = postRequest("b1", { title: "Todo" });
    const res = await POST(request, context);

    expect(res.status).toBe(201);
    expect(listRepo.createList).toHaveBeenCalledWith("b1", "Todo");
  });

  // 異常系: spec/02_list.md E-003
  it("存在しないボードなら 404 NOT_FOUND", async () => {
    vi.mocked(boardRepo.getBoard).mockResolvedValue(null);

    const { request, context } = postRequest("missing", { title: "Todo" });
    const res = await POST(request, context);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(listRepo.createList).not.toHaveBeenCalled();
  });
});
