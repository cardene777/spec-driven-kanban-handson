// spec/000_shared_rules.md § ログ方針 / design/001_boards.md § 監査ログ
// リクエスト ID を発行し、操作ログ・エラーログの両方に付与する。
type Payload = Record<string, unknown>;

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function auditLog(requestId: string, action: string, payload: Payload = {}) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      requestId,
      action,
      ...payload,
    }),
  );
}

export function errorLog(requestId: string, error: unknown, status?: number) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      requestId,
      status,
      message: error instanceof Error ? error.message : String(error),
    }),
  );
}
