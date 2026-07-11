// FR-001 (spec/005_shared_rules.md) エラーレスポンス統一形式
import { NextResponse } from "next/server";

export type ErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

export function errorResponse(
  status: 400 | 404 | 500,
  code: ErrorCode,
  message: string,
) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const validationError = (message: string) =>
  errorResponse(400, "VALIDATION_ERROR", message);

export const notFoundError = (message: string) =>
  errorResponse(404, "NOT_FOUND", message);

export const internalError = () =>
  errorResponse(500, "INTERNAL_ERROR", "サーバーエラーが発生しました");

export const NOT_FOUND_MESSAGES = {
  board: "指定されたボードが見つかりません",
  list: "指定されたリストが見つかりません",
  card: "指定されたカードが見つかりません",
} as const;

export const VALIDATION_MESSAGES = {
  boardOrListTitle: "titleは1〜100文字で入力してください",
  cardTitle: "titleは1〜200文字で入力してください",
} as const;
