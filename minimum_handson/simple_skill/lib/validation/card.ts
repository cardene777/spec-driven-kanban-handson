import { z } from "zod";

// spec/00_common.md: title は trim してから 1〜200 文字を検証する
// spec/03_card.md FR-003 / spec/04_card_edit.md FR-003
export const createCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const updateCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
