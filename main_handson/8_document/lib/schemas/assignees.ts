// spec/009_assignee.md § バリデーション SSOT
// design/009_assignee.md § POST /api/cards/{cardId}/assignees の zod schema
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";

const userIdSchema = z
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
    if (value.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
  })
  .transform((v) => (typeof v === "string" ? v.trim() : ""));

export const assigneeCreateSchema = z
  .object({ userId: userIdSchema })
  .strict();

export function parseAssigneeCreate(body: unknown): { userId: string } {
  return runSchema(() => assigneeCreateSchema.parse(body));
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
