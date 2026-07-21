// spec/000_shared_rules.md § 共通エラー形式
import { NextResponse } from "next/server";

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "GONE"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string>;
  };
};

function build(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, string>,
) {
  const body: ErrorBody = { error: { code, message, ...(details ? { details } : {}) } };
  return NextResponse.json(body, { status });
}

export const unauthorized = () =>
  build("UNAUTHORIZED", "ログインが必要です", 401);
export const forbidden = () =>
  build("FORBIDDEN", "この操作を実行する権限がありません", 403);
export const notFound = (message = "対象のリソースが見つかりません") =>
  build("NOT_FOUND", message, 404);
// spec/000_shared_rules.md: 重複・状態衝突は 409、期限切れ・失効は 410
export const conflict = (message: string, details?: Record<string, string>) =>
  build("CONFLICT", message, 409, details);
export const gone = (message: string, details?: Record<string, string>) =>
  build("GONE", message, 410, details);
export const validationError = (
  message: string,
  details?: Record<string, string>,
) => build("VALIDATION_ERROR", message, 422, details);
export const internalError = (message = "予期しないエラーが発生しました") =>
  build("INTERNAL_ERROR", message, 500);
