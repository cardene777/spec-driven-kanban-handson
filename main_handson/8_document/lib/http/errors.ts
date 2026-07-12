// design/001_boards.md § エラーレスポンス SSOT
// design/011_auth.md § InvalidCredentialsError / § ConflictError の追加
// design/012_member_invite.md § 追加のエラーヘルパ (GoneError)
import { NextResponse } from "next/server";

export class NotFoundError extends Error {
  constructor(message = "not_found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("validation_error");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid_credentials");
    this.name = "InvalidCredentialsError";
  }
}

export class ConflictError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("conflict");
    this.name = "ConflictError";
    this.fields = fields;
  }
}

export type GoneReason = "expired" | "already_used" | "revoked";

export class GoneError extends Error {
  reason: GoneReason;
  constructor(reason: GoneReason) {
    super("gone");
    this.name = "GoneError";
    this.reason = reason;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function invalidCredentials() {
  return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export function validationError(fields: Record<string, string>) {
  return NextResponse.json(
    { error: "validation_error", fields },
    { status: 422 },
  );
}

export function conflictError(fields: Record<string, string>) {
  return NextResponse.json({ error: "conflict", fields }, { status: 409 });
}

export function gone(reason: GoneReason) {
  return NextResponse.json({ error: "gone", reason }, { status: 410 });
}

export function internalError() {
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
