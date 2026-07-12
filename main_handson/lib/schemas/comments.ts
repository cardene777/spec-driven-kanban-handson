// spec/010_comment.md § バリデーション SSOT
// design/010_comment.md § API 設計 > POST の zod schema
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";

const bodySchema = z
  .unknown()
  .superRefine((value, ctx) => {
    if (value === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
    if (typeof value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
      return;
    }
    if (value.length > 2000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_long" });
      return;
    }
    if (value.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
  })
  .transform((v) => v as string);

export const commentCreateSchema = z
  .object({ body: bodySchema })
  .strict();

export function parseCommentCreate(body: unknown): { body: string } {
  return runSchema(() => commentCreateSchema.parse(body));
}

function runSchema<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path[0]?.toString() ?? "_";
        if (!fields[key]) fields[key] = issue.message;
      }
      throw new ValidationError(fields);
    }
    throw err;
  }
}
