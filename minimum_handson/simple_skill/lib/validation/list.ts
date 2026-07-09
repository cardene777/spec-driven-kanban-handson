import { z } from "zod";

// spec/00_common.md: title は trim してから 1〜100 文字を検証する
// spec/02_list.md FR-003
export const createListSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export type CreateListInput = z.infer<typeof createListSchema>;
