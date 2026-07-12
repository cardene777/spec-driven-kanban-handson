// spec/001_boards.md § バリデーション SSOT
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";

const titleSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    if (typeof value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
    if (trimmed.length > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_long" });
      return;
    }
  })
  .transform((v) => (v as string).trim());

export const boardCreateSchema = z
  .object({ title: titleSchema })
  .strict();

export const boardUpdateSchema = z
  .object({ title: titleSchema })
  .strict();

export function parseBoardCreate(body: unknown) {
  return runSchema(() => boardCreateSchema.parse(body));
}

export function parseBoardUpdate(body: unknown) {
  return runSchema(() => boardUpdateSchema.parse(body));
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
