// spec/002_lists.md § バリデーション SSOT
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

export const listCreateSchema = z.object({ title: titleSchema }).strict();
export const listUpdateSchema = z.object({ title: titleSchema }).strict();

export const listOrderSchema = z
  .object({ toIndex: z.unknown() })
  .strict();

export function parseListCreate(body: unknown) {
  return runSchema(() => listCreateSchema.parse(body));
}
export function parseListUpdate(body: unknown) {
  return runSchema(() => listUpdateSchema.parse(body));
}
export function parseListOrder(body: unknown): { toIndex: unknown } {
  const parsed = runSchema(() => listOrderSchema.parse(body));
  return { toIndex: parsed.toIndex };
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
