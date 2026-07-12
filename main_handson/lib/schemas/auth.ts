// spec/011_auth.md § バリデーション SSOT
// design/011_auth.md § API 設計 > zod schema
import { z, ZodError } from "zod";
import { ValidationError } from "@/lib/http/errors";
import { checkPassword } from "@/lib/auth/passwordStrength";

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;

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
  .transform((v) => (typeof v === "string" ? v.trim() : ""));

const passwordSchema = z
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
    if (value.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
    const problem = checkPassword(value);
    if (problem) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
      return;
    }
  })
  .transform((v) => (typeof v === "string" ? v : ""));

const nameSchema = z
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
  .transform((v) => (typeof v === "string" ? v.trim() : ""));

// ログイン用は形式検証を行わない (存在露出防止)
const loginPasswordSchema = z
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
    if (value.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "required" });
      return;
    }
  })
  .transform((v) => (typeof v === "string" ? v : ""));

const loginEmailSchema = z
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
  })
  .transform((v) => (typeof v === "string" ? v.trim() : ""));

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: loginEmailSchema,
    password: loginPasswordSchema,
  })
  .strict();

export function parseSignup(body: unknown): {
  email: string;
  password: string;
  name: string;
} {
  return runSchema(() => signupSchema.parse(body));
}

export function parseLogin(body: unknown): {
  email: string;
  password: string;
} {
  return runSchema(() => loginSchema.parse(body));
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
