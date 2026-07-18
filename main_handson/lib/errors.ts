// spec/000_shared_rules.md § HTTP ステータスコードとエラーレスポンス
import { NextResponse } from "next/server";

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
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
export const validationError = (
  message: string,
  details?: Record<string, string>,
) => build("VALIDATION_ERROR", message, 422, details);
export const internalError = (message = "予期しないエラーが発生しました") =>
  build("INTERNAL_ERROR", message, 500);
