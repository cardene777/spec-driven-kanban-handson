import { ValidationError } from "@/lib/errors";

const TRIM_PATTERN = /^[\s　]+|[\s　]+$/g;

export function validateTitle(raw: unknown, maxLength: number): string {
  const title = typeof raw === "string" ? raw.replace(TRIM_PATTERN, "") : "";
  if (title.length < 1 || title.length > maxLength) {
    throw new ValidationError(`タイトルは1〜${maxLength}文字で入力してください`);
  }
  return title;
}
