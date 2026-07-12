// spec/003_cards.md § バリデーション SSOT
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";

const titleCreateSchema = z
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
    if (trimmed.length > 200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_long" });
      return;
    }
  })
  .transform((v) => (v as string).trim());

const titleOptionalSchema = z
  .unknown()
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined) return;
    if (typeof value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
    if (trimmed.length > 200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_long" });
      return;
    }
  })
  .transform((v) => (v === undefined ? undefined : (v as string).trim()));

const descriptionOptionalSchema = z
  .unknown()
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined) return;
    if (typeof value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
      return;
    }
    if (value.length > 2000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_long" });
      return;
    }
  });

export const cardCreateSchema = z
  .object({ title: titleCreateSchema })
  .strict();

const cardUpdateInner = z
  .object({
    title: titleOptionalSchema,
    description: descriptionOptionalSchema,
  })
  .strict();

export const cardOrderSchema = z
  .object({
    toListId: z.unknown(),
    toIndex: z.unknown(),
  })
  .strict();

export function parseCardCreate(body: unknown) {
  return runSchema(() => cardCreateSchema.parse(body));
}

export function parseCardUpdate(
  body: unknown,
): { title?: string; description?: string } {
  const parsed = runSchema(() => cardUpdateInner.parse(body)) as {
    title?: string;
    description?: string;
  };
  if (parsed.title === undefined && parsed.description === undefined) {
    throw new ValidationError({ _: "no_updates" });
  }
  return parsed;
}

export function parseCardOrder(body: unknown): {
  toListId: unknown;
  toIndex: unknown;
} {
  const parsed = runSchema(() => cardOrderSchema.parse(body));
  return { toListId: parsed.toListId, toIndex: parsed.toIndex };
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
