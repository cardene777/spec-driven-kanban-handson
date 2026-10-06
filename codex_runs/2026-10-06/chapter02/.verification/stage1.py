from pathlib import Path
import json
p=Path('prompt')
def write(n,s):
 f=p/n; f.parent.mkdir(parents=True,exist_ok=True); f.write_text(s)
write('prisma/schema.prisma','''generator client {
 provider = "prisma-client"
 output = "../generated/prisma"
}
datasource db {
 provider = "sqlite"
}
model Board {
 id String @id @default(cuid())
 title String
 createdAt DateTime @default(now())
}
''')
write('prisma.config.ts','''import { defineConfig } from "prisma/config";
export default defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations" }, datasource: { url: "file:./prisma/dev.db" } });
''')
write('lib/prisma.ts','''import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalDb.prisma ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });
if (process.env.NODE_ENV !== "production") globalDb.prisma = prisma;
''')
write('lib/http.ts','''export function error(status: number, code: string, message: string) {
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
''')
write('app/api/boards/route.ts','''import { prisma } from "@/lib/prisma";
import { error, titleOf, jsonBody } from "@/lib/http";
export async function GET() {
 return Response.json(await prisma.board.findMany({ orderBy: { createdAt: "desc" } }));
}
export async function POST(request: Request) {
 const title = titleOf(await jsonBody(request), 100);
 if (!title) return error(400, "VALIDATION_ERROR", "タイトルは1〜100文字で入力してください");
 return Response.json(await prisma.board.create({ data: { title } }), { status: 201 });
}
''')
write('app/components/CreateForm.tsx','''"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CreateForm({ label, url }: { label: string; url: string }) {
 const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
 const router = useRouter();
 return <div className="p-3">{!open ? <button onClick={() => setOpen(true)} className="rounded bg-blue-700 px-4 py-2 text-white">{label}</button> : <form onSubmit={async event => {
 event.preventDefault(); setBusy(true); setError("");
 try {
 const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
 const data = await response.json();
 if (!response.ok) { setError(data.error.message); return; }
 setTitle(""); setOpen(false); router.refresh();
 } catch { setError("保存に失敗しました"); } finally { setBusy(false); }
 }}>
 <label>タイトル<input aria-label="タイトル" className="block rounded border p-2 text-black" value={title} onChange={e => setTitle(e.target.value)} /></label>
 <button disabled={busy} className="mt-2 rounded bg-blue-700 px-3 py-2 text-white">作成</button>
 <button type="button" onClick={() => {setOpen(false); setError("");}} className="m-2">キャンセル</button>
 {error && <p role="alert" className="text-red-700">{error}</p>}
 </form>}</div>;
}
''')
write('app/page.tsx','''import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateForm from "./components/CreateForm";
export const dynamic = "force-dynamic";
export default async function Home() {
 const boards = await prisma.board.findMany({ orderBy: { createdAt: "desc" } });
 return <main className="p-8"><h1 className="text-2xl font-bold">カンバン一覧</h1><div className="mt-6 flex flex-wrap gap-4">{boards.map(board => <Link className="rounded border p-6" key={board.id} href={`/boards/${board.id}`}>{board.title}</Link>)}<CreateForm label="新規ボード作成" url="/api/boards" /></div></main>;
}
''')
write('app/boards/[id]/page.tsx','''import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; const board = await prisma.board.findUnique({ where: { id } });
 if (!board) notFound();
 return <main className="p-8"><Link href="/">一覧へ</Link><h1 className="text-2xl font-bold">{board.title}</h1></main>;
}
''')
write('app/layout.tsx','''import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "カンバン", description: "最小構成のカンバン" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body>{children}</body></html>; }
''')
write('app/globals.css','''@import "tailwindcss";
body { background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
button { cursor: pointer; }
''')
write('vitest.config.ts','''import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } }, test: { environment: "node", fileParallelism: false } });
''')
write('tests/board.test.ts','''import { beforeEach, afterAll, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/boards/route";
beforeEach(async () => { await prisma.board.deleteMany(); });
afterAll(async () => { await prisma.$disconnect(); });
const request = (title: string) => new Request("http://localhost/api/boards", { method: "POST", body: JSON.stringify({ title }) });
test("正常作成、トリム、表示", async () => {
 const r = await POST(request(" 　会社プロジェクト\\t\\n")); expect(r.status).toBe(201); expect((await r.json()).title).toBe("会社プロジェクト");
 expect((await (await GET()).json()).map((b: { title: string }) => b.title)).toEqual(["会社プロジェクト"]);
});
test.each(["", "a".repeat(101)])("不正タイトルは追加しない", async title => {
 const r = await POST(request(title)); expect(r.status).toBe(400); expect((await r.json()).error.code).toBe("VALIDATION_ERROR"); expect(await prisma.board.count()).toBe(0);
});
''')
pkg=json.loads((p/'package.json').read_text());pkg['scripts'].update({'lint':'eslint .','typecheck':'tsc --noEmit','test':'vitest run'});(p/'package.json').write_text(json.dumps(pkg,indent=2)+'\n')
with (p/'.gitignore').open('a') as f:f.write('\n/generated/\n/prisma/*.db*\n')
print('Stage1 independently generated from input1.')
