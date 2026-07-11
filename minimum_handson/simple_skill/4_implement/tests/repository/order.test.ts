// spec/005_shared_rules.md FR-004 order 採番: 既存最大値 + 1、0 件なら 0
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    list: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    card: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { createListInBoard } from "@/lib/repository/lists";
import { createCardInList } from "@/lib/repository/cards";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createListInBoard の order 採番", () => {
  it("既存 0 件のとき order=0 を採番", async () => {
    vi.mocked(prisma.list.aggregate).mockResolvedValueOnce({
      _max: { order: null },
    } as never);
    vi.mocked(prisma.list.create).mockResolvedValueOnce({} as never);
    await createListInBoard("b1", "t");
    expect(prisma.list.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 0 }),
      }),
    );
  });

  it("既存最大 5 のとき order=6 を採番", async () => {
    vi.mocked(prisma.list.aggregate).mockResolvedValueOnce({
      _max: { order: 5 },
    } as never);
    vi.mocked(prisma.list.create).mockResolvedValueOnce({} as never);
    await createListInBoard("b1", "t");
    expect(prisma.list.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 6 }),
      }),
    );
  });
});

describe("createCardInList の order 採番", () => {
  it("既存 0 件のとき order=0 を採番、description は null 固定", async () => {
    vi.mocked(prisma.card.aggregate).mockResolvedValueOnce({
      _max: { order: null },
    } as never);
    vi.mocked(prisma.card.create).mockResolvedValueOnce({} as never);
    await createCardInList("l1", "t");
    expect(prisma.card.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          order: 0,
          description: null,
        }),
      }),
    );
  });

  it("既存最大 2 のとき order=3 を採番", async () => {
    vi.mocked(prisma.card.aggregate).mockResolvedValueOnce({
      _max: { order: 2 },
    } as never);
    vi.mocked(prisma.card.create).mockResolvedValueOnce({} as never);
    await createCardInList("l1", "t");
    expect(prisma.card.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 3 }),
      }),
    );
  });
});
