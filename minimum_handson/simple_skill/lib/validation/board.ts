import { z } from "zod";

// spec/00_common.md: title は trim してから 1〜100 文字を検証する
// spec/01_board.md FR-003
export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
