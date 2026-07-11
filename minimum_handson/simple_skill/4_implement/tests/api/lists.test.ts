// spec/002_lists.md E-001 (404) / E-002-005 (400)、共通ルール 404 優先
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repository/boards", () => ({
  findBoardById: vi.fn(),
}));
vi.mock("@/lib/repository/lists", () => ({
  findListsByBoardId: vi.fn(),
  createListInBoard: vi.fn(),
}));

import { findBoardById } from "@/lib/repository/boards";
import {
  createListInBoard,
  findListsByBoardId,
} from "@/lib/repository/lists";
import { GET, POST } from "@/app/api/boards/[id]/lists/route";

const makeRequest = (body?: unknown) =>
  new Request("http://localhost/api/boards/x/lists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/boards/[id]/lists", () => {
  it("board が存在しないと 404", async () => {
    vi.mocked(findBoardById).mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), params("nope"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("指定されたボードが見つかりません");
  });

  it("board が存在すると 200 でリスト配列を返す", async () => {
    vi.mocked(findBoardById).mockResolvedValueOnce({
      id: "b1",
      title: "b",
      createdAt: new Date(),
    });
    vi.mocked(findListsByBoardId).mockResolvedValueOnce([]);
    const res = await GET(makeRequest(), params("b1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ lists: [] });
  });
});

describe("POST /api/boards/[id]/lists", () => {
  it("404 と 400 が同時成立でも 404 を優先する", async () => {
    vi.mocked(findBoardById).mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ title: "" }), params("nope"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(createListInBoard).not.toHaveBeenCalled();
  });

  it("title が空だと 400", async () => {
    vi.mocked(findBoardById).mockResolvedValueOnce({
      id: "b1",
      title: "b",
      createdAt: new Date(),
    });
    const res = await POST(makeRequest({ title: "   " }), params("b1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("titleは1〜100文字で入力してください");
  });

  it("正常系: trim 後の値で作成", async () => {
    vi.mocked(findBoardById).mockResolvedValueOnce({
      id: "b1",
      title: "b",
      createdAt: new Date(),
    });
    const created = {
      id: "l1",
      title: "hello",
      order: 0,
      boardId: "b1",
      createdAt: new Date(),
    };
    vi.mocked(createListInBoard).mockResolvedValueOnce(created);
    const res = await POST(makeRequest({ title: "  hello  " }), params("b1"));
    expect(res.status).toBe(201);
    expect(createListInBoard).toHaveBeenCalledWith("b1", "hello");
    const body = await res.json();
    expect(body.list.title).toBe("hello");
  });
});
