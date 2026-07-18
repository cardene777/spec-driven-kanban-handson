// design/001_boards.md § 監査ログ
type Payload = Record<string, unknown>;

export function auditLog(action: string, payload: Payload) {
  const record = {
    ts: new Date().toISOString(),
    action,
    ...payload,
  };
  console.info(JSON.stringify(record));
}
