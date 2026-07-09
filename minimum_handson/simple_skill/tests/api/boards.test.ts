import { describe, it, expect, vi, beforeEach } from "vitest";

// repository をモックして DB なしでハンドラを検証する
vi.mock("@/lib/repository/board", () => ({
  listBoards: vi.fn(),
  createBoard: vi.fn(),
  getBoard: vi.fn(),
}));

import { POST } from "@/app/api/boards/route";
import * as repo from "@/lib/repository/board";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/boards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 正常系: spec/01_board.md FR-003
  it("有効なタイトルなら 201 で作成する", async () => {
    vi.mocked(repo.createBoard).mockResolvedValue({
      id: "b1",
      title: "My board",
      createdAt: new Date(0),
    });

    const res = await POST(postRequest({ title: "My board" }));

    expect(res.status).toBe(201);
    expect(repo.createBoard).toHaveBeenCalledWith("My board");
  });

  // 異常系: spec/01_board.md E-001
  it("空白のみのタイトルは 400 VALIDATION_ERROR", async () => {
    const res = await POST(postRequest({ title: "   " }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(repo.createBoard).not.toHaveBeenCalled();
  });
});
