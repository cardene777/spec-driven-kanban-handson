// FR-COM-002, FR-COM-004
export const failure = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });
export const missing = () => failure(404, "NOT_FOUND", "対象が見つかりません");
export const invalid = (max: number) => failure(400, "VALIDATION_ERROR", `タイトルは1〜${max}文字で入力してください`);
export async function readBody(request: Request): Promise<Record<string, unknown>> {
 try { const body = await request.json(); return body && typeof body === "object" ? body : {}; } catch { return {}; }
}
export function validTitle(value: unknown, max: number) {
 if (typeof value !== "string") return null;
 const title = value.trim(); return title.length > 0 && title.length <= max ? title : null;
}
