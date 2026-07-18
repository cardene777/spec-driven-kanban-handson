// spec/00_common.md: エラーレスポンス形式
import { NextResponse } from "next/server";

type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

export function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const validationError = (message: string) =>
  errorResponse("VALIDATION_ERROR", message, 400);
export const notFoundError = (message: string) =>
  errorResponse("NOT_FOUND", message, 404);
export const internalError = (message = "予期しないエラーが発生しました") =>
  errorResponse("INTERNAL_ERROR", message, 500);
