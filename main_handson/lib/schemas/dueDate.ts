// spec/007_due_date.md § バリデーション SSOT
// design/007_due_date.md § PATCH /api/cards/{cardId}/due-date の zod schema
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";
import { isDateFormat, isRealDate } from "@/lib/dueDate/validate";

// body = { dueDate: string(YYYY-MM-DD) | null }。フィールド未指定は required。
const dueDateUpdateSchema = z
  .object({
    dueDate: z.unknown().superRefine((value, ctx) => {
      if (value === undefined) {
        // body 全体が空 = dueDate 未指定 (spec § 異常系: required)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
        return;
      }
      if (value === null) return; // 解除
      if (typeof value !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
        return;
      }
      if (!isDateFormat(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_format" });
        return;
      }
      if (!isRealDate(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_date" });
        return;
      }
    }),
  })
  .strict();

export function parseDueDateUpdate(body: unknown): { dueDate: string | null } {
  const parsed = runSchema(() => dueDateUpdateSchema.parse(body)) as {
    dueDate: string | null;
  };
  return { dueDate: parsed.dueDate ?? null };
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
