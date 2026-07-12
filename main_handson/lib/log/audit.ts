// design/001_boards.md § 監査ログの共通形式 SSOT
// design/011_auth.md § 監査ログ / § TargetType に user 追加
// design/012_member_invite.md § TargetType に invite 追加
// design/013_permissions.md § TargetType に member 追加
export type AuditLevel = "info" | "warn" | "error";
export type TargetType =
  | "board"
  | "list"
  | "card"
  | "comment"
  | "user"
  | "invite"
  | "member";

export type AuditErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "invalid_credentials"
  | "conflict"
  | "gone"
  | "internal_error"
  | null;

export type AuditEvent = {
  timestamp?: string;
  level: AuditLevel;
  event: string;
  actorId: string | null;
  targetType: TargetType;
  targetId: string | null;
  status: number;
  errorCode: AuditErrorCode;
  context?: Record<string, unknown>;
};

export function logAudit(event: AuditEvent) {
  const record = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    ...event,
  };
  console.log(JSON.stringify(record));
}
