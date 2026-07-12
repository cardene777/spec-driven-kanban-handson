// spec/013_permissions.md § バリデーション SSOT
// design/013_permissions.md § API 設計 > PATCH /members/{userId} の zod schema
import { z, ZodError } from "zod";
import type { Role } from "@prisma/client";
import { ValidationError } from "@/lib/http/errors";

const ALLOWED_ROLES = ["owner", "member", "viewer"] as const;

const roleSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    if (value === undefined || value === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
    if (typeof value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_type" });
      return;
    }
    if (!ALLOWED_ROLES.includes(value as (typeof ALLOWED_ROLES)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid_value",
      });
      return;
    }
  })
  .transform((v) => v as Role);

export const roleUpdateSchema = z.object({ role: roleSchema }).strict();

export function parseRoleUpdate(body: unknown): { role: Role } {
  return runSchema(() => roleUpdateSchema.parse(body));
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
