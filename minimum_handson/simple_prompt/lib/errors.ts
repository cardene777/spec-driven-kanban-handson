import { NextResponse } from "next/server";

export class AppError extends Error {
  constructor(
    public readonly code: "VALIDATION_ERROR" | "NOT_FOUND",
    public readonly status: 400 | 404,
    message: string,
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", 400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", 404, message);
  }
}

export function errorResponse(error: AppError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status },
  );
}
