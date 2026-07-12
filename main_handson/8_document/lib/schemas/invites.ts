// spec/012_member_invite.md § バリデーション SSOT
// design/012_member_invite.md § API 設計 > POST /invites の zod schema
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
const ALLOWED_ROLES = ["member", "viewer"] as const;

const emailSchema = z
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
    if (value.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
    if (!EMAIL_RE.test(value.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "invalid_format",
      });
      return;
    }
  })
  .transform((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""));

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
  .transform((v) => v as (typeof ALLOWED_ROLES)[number]);

export const inviteCreateSchema = z
  .object({ email: emailSchema, role: roleSchema })
  .strict();

export function parseInviteCreate(body: unknown): {
  email: string;
  role: "member" | "viewer";
} {
  return runSchema(() => inviteCreateSchema.parse(body));
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
