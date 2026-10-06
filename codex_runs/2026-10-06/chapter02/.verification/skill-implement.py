from pathlib import Path
import json
p=Path('skill')
def write(n,s):
 f=p/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
write('prisma/schema.prisma','''// FR-COM-001: 親子関係を永続化する。
generator client {
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
 lists List[]
}
model List {
 id String @id @default(cuid())
 title String
 order Int
 boardId String
 createdAt DateTime @default(now())
 board Board @relation(fields: [boardId], references: [id])
 cards Card[]
}
model Card {
 id String @id @default(cuid())
 title String
 description String?
 order Int
 listId String
 createdAt DateTime @default(now())
 list List @relation(fields: [listId], references: [id])
}
''')
write('prisma.config.ts','''// FR-COM-001
import { defineConfig } from "prisma/config";
export default defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations" }, datasource: { url: "file:./prisma/dev.db" } });
''')
write('lib/db.ts','''// FR-COM-001
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const scope = globalThis as unknown as { kanbanDb?: PrismaClient };
export const db = scope.kanbanDb ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) });
if (process.env.NODE_ENV !== "production") scope.kanbanDb = db;
''')
write('lib/input.ts','''// FR-COM-002, FR-COM-004
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
''')
write('app/api/boards/route.ts','''// FR-BOARD-001, FR-BOARD-002, FR-COM-003
import { db } from "@/lib/db";
import { readBody, validTitle, invalid } from "@/lib/input";
export async function GET() { return Response.json(await db.board.findMany({ orderBy: { createdAt: "desc" } })); }
export async function POST(request: Request) {
 const body = await readBody(request), title = validTitle(body.title, 100);
 if (title === null) return invalid(100);
 return Response.json(await db.board.create({ data: { title } }), { status: 201 });
}
''')
write('app/api/boards/[id]/lists/route.ts','''// FR-LIST-001, FR-LIST-002, FR-COM-003, FR-COM-004
import { db } from "@/lib/db";
import { readBody, validTitle, invalid, missing } from "@/lib/input";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.board.findUnique({ where: { id } }))) return missing();
 return Response.json(await db.list.findMany({ where: { boardId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.board.findUnique({ where: { id } }))) return missing();
 const title = validTitle((await readBody(request)).title, 100);
 if (title === null) return invalid(100);
 const { _max } = await db.list.aggregate({ where: { boardId: id }, _max: { order: true } });
 return Response.json(await db.list.create({ data: { title, boardId: id, order: (_max.order ?? -1) + 1 } }), { status: 201 });
}
''')
write('app/api/lists/[id]/cards/route.ts','''// FR-CARD-001, FR-CARD-002, FR-COM-003, FR-COM-004
import { db } from "@/lib/db";
import { readBody, validTitle, invalid, missing } from "@/lib/input";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.list.findUnique({ where: { id } }))) return missing();
 return Response.json(await db.card.findMany({ where: { listId: id }, orderBy: { order: "asc" } }));
}
export async function POST(request: Request, { params }: Context) {
 const { id } = await params;
 if (!(await db.list.findUnique({ where: { id } }))) return missing();
 const body = await readBody(request), title = validTitle(body.title, 200);
 if (title === null) return invalid(200);
 const description = typeof body.description === "string" ? body.description : null;
 const { _max } = await db.card.aggregate({ where: { listId: id }, _max: { order: true } });
 return Response.json(await db.card.create({ data: { title, description, listId: id, order: (_max.order ?? -1) + 1 } }), { status: 201 });
}
''')
write('app/api/cards/[id]/route.ts','''// FR-EDIT-001, FR-COM-002, FR-COM-004
import { db } from "@/lib/db";
import { readBody, validTitle, invalid, missing } from "@/lib/input";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!(await db.card.findUnique({ where: { id } }))) return missing();
 const title = validTitle((await readBody(request)).title, 200);
 if (title === null) return invalid(200);
 return Response.json(await db.card.update({ where: { id }, data: { title } }));
}
''')
write('app/components/create-form.tsx','''"use client";
// FR-BOARD-002, FR-LIST-002, FR-CARD-002, FR-COM-002
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CreateForm({ url, label }: { url: string; label: string }) {
 const router = useRouter();
 const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
 if (!open) return <button className="action" onClick={() => setOpen(true)}>{label}</button>;
 return <form className="space-y-2" onSubmit={async event => {
 event.preventDefault(); setPending(true); setMessage("");
 try {
 const result = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
 const data = await result.json();
 if (!result.ok) { setMessage(data.error.message); return; }
 setTitle("");setOpen(false);router.refresh();
 } catch { setMessage("保存に失敗しました"); } finally { setPending(false); }
 }}>
 <label className="block">タイトル<input aria-label="タイトル" className="entry" value={title} onChange={event => setTitle(event.target.value)} /></label>
 <button className="action" disabled={pending}>作成</button>
 <button className="ml-3" type="button" onClick={() => {setOpen(false);setMessage("");}}>キャンセル</button>
 {message && <p role="alert" className="text-red-700">{message}</p>}
 </form>;
}
''')
write('app/components/edit-title.tsx','''"use client";
// FR-EDIT-001: 失敗したdraftで保存済みタイトルを上書きしない。
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function EditTitle({ id, title }: { id: string; title: string }) {
 const router = useRouter();
 const [editing, setEditing] = useState(false), [draft, setDraft] = useState(title), [message, setMessage] = useState("");
 return <div className="rounded border border-slate-200 bg-white p-3">
 {editing ? <input autoFocus aria-label="カードタイトル" className="entry" value={draft} onChange={event => setDraft(event.target.value)} onBlur={async () => {
 setEditing(false);setMessage("");
 try {
 const result = await fetch(`/api/cards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft }) });
 const data = await result.json();
 if (!result.ok) {setDraft(title);setMessage(data.error.message);return;}
 setDraft(data.title);router.refresh();
 } catch {setDraft(title);setMessage("保存に失敗しました");}
 }} /> : <button className="w-full text-left" onClick={() => {setDraft(title);setMessage("");setEditing(true);}}>{title}</button>}
 {message && <p role="alert" className="text-red-700">{message}</p>}
 </div>;
}
''')
write('app/page.tsx','''// FR-BOARD-001, FR-BOARD-002, FR-COM-003
import Link from "next/link";
import { db } from "@/lib/db";
import CreateForm from "./components/create-form";
export const dynamic = "force-dynamic";
export default async function Home() {
 const boards = await db.board.findMany({ orderBy: { createdAt: "desc" } });
 return <main className="mx-auto max-w-5xl p-8"><h1 className="mb-6 text-3xl font-bold">カンバン一覧</h1>
 <div className="flex flex-wrap items-start gap-4">{boards.map(board => <Link key={board.id} href={`/boards/${board.id}`} className="rounded border bg-white p-6 shadow-sm">{board.title}</Link>)}<CreateForm label="新規ボード作成" url="/api/boards" /></div></main>;
}
''')
write('app/boards/[id]/page.tsx','''// FR-LIST-001, FR-LIST-002, FR-CARD-001, FR-CARD-002, FR-EDIT-001
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CreateForm from "@/app/components/create-form";
import EditTitle from "@/app/components/edit-title";
export const dynamic = "force-dynamic";
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const board = await db.board.findUnique({ where: { id }, include: { lists: { orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } } } });
 if (!board) notFound();
 return <main className="p-8"><Link href="/" className="text-blue-700">一覧へ</Link><h1 className="my-4 text-3xl font-bold">{board.title}</h1>
 <div className="flex items-start gap-5 overflow-x-auto">{board.lists.map(list => <section key={list.id} className="w-72 shrink-0 rounded bg-slate-200 p-4"><h2 className="mb-3 font-bold">{list.title}</h2>
 <div className="mb-4 flex flex-col gap-2">{list.cards.map(card => <EditTitle key={card.id} id={card.id} title={card.title} />)}</div>
 <CreateForm label="カード追加" url={`/api/lists/${list.id}/cards`} /></section>)}<CreateForm label="リスト作成" url={`/api/boards/${id}/lists`} /></div></main>;
}
''')
write('app/layout.tsx','''// FR-BOARD-001, FR-LIST-001
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Simple Kanban" };
export default function Layout({ children }: { children: React.ReactNode }) {return <html lang="ja"><body>{children}</body></html>;}
''')
write('app/globals.css','''/* FR-BOARD-001, FR-LIST-001, FR-CARD-001 */
@import "tailwindcss";
body { background: #f8fafc; color: #0f172a; font-family: sans-serif; }
button { cursor: pointer; }
.action { border-radius: .35rem; background: #1d4ed8; color: white; padding: .6rem 1rem; }
.entry { display: block; width: 100%; border: 1px solid #94a3b8; border-radius: .25rem; padding: .4rem; background: white; }
''')
write('postcss.config.mjs','''// FR-BOARD-001, FR-LIST-001
export default { plugins: { "@tailwindcss/postcss": {} } };
''')
write('eslint.config.mjs','''// FR-COM-001: 生成されたClientは検証対象コードから除外する。
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTypescript, globalIgnores([".next/**", "generated/**", "next-env.d.ts"])]);
''')
write('tsconfig.json',json.dumps({'compilerOptions':{'target':'ES2017','lib':['dom','dom.iterable','esnext'],'allowJs':True,'skipLibCheck':True,'strict':True,'noEmit':True,'esModuleInterop':True,'module':'esnext','moduleResolution':'bundler','resolveJsonModule':True,'isolatedModules':True,'jsx':'react-jsx','incremental':True,'plugins':[{'name':'next'}],'paths':{'@/*':['./*']}},'include':['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts','.next/dev/types/**/*.ts'],'exclude':['node_modules']},indent=2)+'\n')
write('next-env.d.ts','''/// <reference types="next" />
/// <reference types="next/image-types/global" />
// FR-BOARD-001, FR-LIST-001
''')
write('vitest.config.mts','''// FR-COM-001, FR-COM-002, FR-COM-003, FR-COM-004
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } }, test: { environment: "node", setupFiles: ["tests/setup.ts"], fileParallelism: false } });
''')
write('tests/setup.ts','''// FR-COM-001: アプリのDBを壊さず同じmigrationで検証する。
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
const db = new Database("prisma/test.db");
for (const dir of readdirSync("prisma/migrations", { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
 try { db.exec(readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8")); } catch (error) {
 if (!(error instanceof Error) || !error.message.includes("already exists")) throw error;
 }
}
db.close();
process.env.DATABASE_URL = "file:./prisma/test.db";
''')
write('.gitignore','''# FR-COM-001
node_modules/
.next/
generated/
prisma/*.db*
.env*
*.tsbuildinfo
''')
print('Skill app independently generated from its constitution/spec/design. No prompt files read or copied.')
