export function error(status: number, code: string, message: string) {
 return Response.json({ error: { code, message } }, { status });
}
export function titleOf(body: unknown, max: number): string | null {
 if (!body || typeof body !== "object" || !("title" in body) || typeof body.title !== "string") return null;
 const title = body.title.trim();
 return title.length >= 1 && title.length <= max ? title : null;
}
export async function jsonBody(request: Request): Promise<unknown> {
 try { return await request.json(); } catch { return null; }
}
