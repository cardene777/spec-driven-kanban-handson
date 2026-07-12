// design/001_boards.md § 認証・認可の共通ユーティリティ SSOT
// design/011_auth.md § InvalidCredentialsError / ConflictError の分岐追加
// design/012_member_invite.md § GoneError の分岐追加
import { NextResponse } from "next/server";
import {
  ConflictError,
  ForbiddenError,
  GoneError,
  InvalidCredentialsError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  conflictError,
  forbidden,
  gone,
  internalError,
  invalidCredentials,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/http/errors";
import { logAudit, type AuditErrorCode, type AuditLevel, type TargetType } from "@/lib/log/audit";

type Options = {
  event: string;
  targetType: TargetType;
  actorId?: string | null;
  targetId?: string | null;
  context?: Record<string, unknown>;
};

export async function withApiHandler(
  fn: () => Promise<NextResponse>,
  options: Options,
): Promise<NextResponse> {
  try {
    const res = await fn();
    logAudit({
      level: "info",
      event: options.event,
      actorId: options.actorId ?? null,
      targetType: options.targetType,
      targetId: options.targetId ?? null,
      status: res.status,
      errorCode: null,
      context: options.context,
    });
    return res;
  } catch (err) {
    return handleError(err, options);
  }
}

function handleError(err: unknown, options: Options): NextResponse {
  let level: AuditLevel = "warn";
  let errorCode: AuditErrorCode = "internal_error";
  let status = 500;
  let response: NextResponse;

  if (err instanceof UnauthorizedError) {
    errorCode = "unauthorized";
    status = 401;
    response = unauthorized();
  } else if (err instanceof InvalidCredentialsError) {
    errorCode = "invalid_credentials";
    status = 401;
    response = invalidCredentials();
  } else if (err instanceof ForbiddenError) {
    errorCode = "forbidden";
    status = 403;
    response = forbidden();
  } else if (err instanceof NotFoundError) {
    errorCode = "not_found";
    status = 404;
    response = notFound();
  } else if (err instanceof ConflictError) {
    errorCode = "conflict";
    status = 409;
    response = conflictError(err.fields);
  } else if (err instanceof GoneError) {
    errorCode = "gone";
    status = 410;
    response = gone(err.reason);
  } else if (err instanceof ValidationError) {
    errorCode = "validation_error";
    status = 422;
    response = validationError(err.fields);
  } else {
    level = "error";
    errorCode = "internal_error";
    status = 500;
    response = internalError();
  }

  const errContext: Record<string, unknown> = {};
  if (err instanceof ValidationError || err instanceof ConflictError) {
    errContext.fields = err.fields;
  }
  if (err instanceof GoneError) {
    errContext.reason = err.reason;
  }
  if (level === "error" && err instanceof Error) {
    errContext.stack = err.stack;
  }

  logAudit({
    level,
    event: options.event,
    actorId: options.actorId ?? null,
    targetType: options.targetType,
    targetId: options.targetId ?? null,
    status,
    errorCode,
    context: {
      ...(options.context ?? {}),
      ...errContext,
    },
  });

  return response;
}
