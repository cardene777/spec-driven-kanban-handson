// 共通ルール: エラー応答は { error: { code, message } } に統一する（spec/00_common.md）
import { NextResponse } from "next/server";

export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND";

// バリデーション失敗などのドメインエラーを表す例外
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
  }
}

// 統一エラー形式の JSON レスポンスを返す
export function errorResponse(error: AppError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status },
  );
}
