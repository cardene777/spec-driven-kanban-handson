// spec/006_label.md § バリデーション SSOT
// design/006_label.md § POST /api/boards/{boardId}/labels の zod schema
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";
import { LABEL_COLORS, type LabelColor } from "@/lib/labels/colors";

// name = 文字列。トリム後 1〜50 文字。作成時は必須、編集時は任意 (指定時のみ検証)。
function nameSchema(optional: boolean) {
  return z
    .unknown()
    .superRefine((value, ctx) => {
      if (value === undefined) {
        if (!optional) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
        }
        return;
      }
      if (typeof value !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
        return;
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
        return;
      }
      if (trimmed.length > 50) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too_long" });
        return;
      }
    })
    .transform((v) => (typeof v === "string" ? v.trim() : undefined));
}

// color = 8 色の列挙値 (小文字固定)。作成時は必須、編集時は任意。
function colorSchema(optional: boolean) {
  return z.unknown().superRefine((value, ctx) => {
    if (value === undefined) {
      if (!optional) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      }
      return;
    }
    if (typeof value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
      return;
    }
    if (!(LABEL_COLORS as readonly string[]).includes(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_color" });
      return;
    }
  });
}

const labelCreateSchema = z
  .object({ name: nameSchema(false), color: colorSchema(false) })
  .strict();

const labelUpdateInner = z
  .object({ name: nameSchema(true), color: colorSchema(true) })
  .strict();

export function parseLabelCreate(body: unknown): {
  name: string;
  color: LabelColor;
} {
  const parsed = runSchema(() => labelCreateSchema.parse(body));
  return { name: parsed.name as string, color: parsed.color as LabelColor };
}

export function parseLabelUpdate(body: unknown): {
  name?: string;
  color?: LabelColor;
} {
  const parsed = runSchema(() => labelUpdateInner.parse(body)) as {
    name?: string;
    color?: LabelColor;
  };
  if (parsed.name === undefined && parsed.color === undefined) {
    throw new ValidationError({ _: "no_updates" });
  }
  const result: { name?: string; color?: LabelColor } = {};
  if (parsed.name !== undefined) result.name = parsed.name;
  if (parsed.color !== undefined) result.color = parsed.color;
  return result;
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
