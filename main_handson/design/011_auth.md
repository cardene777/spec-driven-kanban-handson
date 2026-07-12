# 認証機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/011_auth.md`

## 前提

Prisma 全体スキーマ、認証・認可の共通ユーティリティ、エラーレスポンスヘルパ、監査ログ形式、バリデーション方針 (zod)、`withApiHandler` は `design/001_boards.md § 共通設計方針` を参照する。
本 file は `spec/011_auth.md` を満たす認証機構 (サインアップ / ログイン / ログアウト / 現在ユーザー取得 / セッション延長) の設計に閉じる。

## 既存設計との差分

- `design/001_boards.md § 認証・認可の共通ユーティリティ` は `getCurrentUser(request)` を「認証機構は別 spec、 本設計では抽象に留める」 として定義していた。本 file がその実体を規定する。
- 開発検証用の `X-User-Id` header 経路 (`lib/auth/currentUser.ts`) は Cookie ベースの Session 経路に置き換える。`X-User-Id` は完全に廃止し、`getCurrentUser(request)` の実装を `request.cookies.get("sid")` に変更する。
- `lib/client/apiFetch.ts` の `X-User-Id` header 付与も廃止する。fetch は Cookie を暗黙で送るため、client 側で追加 header は不要。
- `lib/http/errors.ts` の 4 種ヘルパは変更せず、本 spec が追加する `409 Conflict` は `lib/http/errors.ts` に `ConflictError` / `conflictError()` を追加する (`design/009_assignee.md § 追加のエラーヘルパ` と同形の追加、`design/012_member_invite.md` と共有)。

## データモデル

### User モデル拡張 (既存)

`prisma/schema.prisma` の既存 `User` に本 spec のフィールドを追加する。

```prisma
model User {
  id           String            @id @default(cuid())
  email        String            @unique
  passwordHash String
  name         String
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  memberships   BoardMembership[]
  comments      Comment[]         @relation("CommentAuthor")
  assignedCards CardAssignee[]    @relation("CardAssignees")
  sessions      Session[]         @relation("UserSessions")
  invitesSent   Invite[]          @relation("InviterUser")
}
```

- `email` に `@unique` を付与し、DB 制約で一意性を担保する (`spec/011_auth.md § 対象データ`)。SQLite は大文字小文字を区別する `@unique` のため、アプリ層で常に小文字化して保存 / 検索する (`§ サインアップの実装` / `§ ログインの実装`)。
- `passwordHash` は `bcryptjs` (Node.js 依存不要な JS 実装、SQLite / Vitest との相性が良い) で生成する。cost = 10 (`design/013_permissions.md` と共有)。
- `passwordHash` は API レスポンスで返さない (Route Handler で明示的に `select` する)。

### Session モデル (新設)

`prisma/schema.prisma` に以下を追加する。

```prisma
model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation("UserSessions", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

- `id` は Cookie の値と一致する。`crypto.randomBytes(32).toString("base64url")` で生成 (43 文字前後の URL-safe 文字列)。
- `expiresAt` は発行時点 + 7 日 (`spec/011_auth.md § 境界条件 § Session の有効期限`)。
- `onDelete: Cascade` により User 物理削除で Session も自動削除される (本 spec は User 削除を対象外だが、将来対応)。
- `@@index([expiresAt])` は期限切れ Session の一括削除 (別途 cleanup job で使う想定、本 spec 対象外)。

### JSON 表現

User (API レスポンス、`passwordHash` を除外)。

```json
{
  "id": "clx...",
  "email": "user@example.com",
  "name": "User Name"
}
```

- サインアップ / ログイン / `me` / `refresh` の成功レスポンス body は `{ "user": User }`。
- 認証失敗 (`invalid_credentials`) の body は `{ "error": "invalid_credentials" }` (`spec/000_shared_rules.md` の 4 種の `unauthorized` とは別 code、`§ Route Handler の実装` 参照)。

## API 設計

`spec/011_auth.md § API` の 5 endpoint を Route Handler で実装する。file 配置。

- `app/api/auth/signup/route.ts` … `POST`
- `app/api/auth/login/route.ts` … `POST`
- `app/api/auth/logout/route.ts` … `POST`
- `app/api/auth/me/route.ts` … `GET`
- `app/api/auth/refresh/route.ts` … `POST`

### 共通の Cookie 属性

`spec/011_auth.md § 非機能要件 § セキュリティ` に従い、以下を default とする。

| 属性 | 値 | 理由 |
|---|---|---|
| `HttpOnly` | 有効 | XSS 経由の Cookie 盗難防止 |
| `SameSite` | `Lax` | CSRF 対策の基本方針。ハンズオン初期実装で十分 |
| `Secure` | `process.env.NODE_ENV === "production"` | 本番環境のみ HTTPS 必須。localhost 開発では無効 |
| `Path` | `/` | 全 API 共通 |
| `Max-Age` | 604800 (7 日、秒) | Session の `expiresAt` と一致 |

Cookie 名は `sid` に固定する。

### `POST /api/auth/signup` サインアップ

- 入力 body = `{ email: string, password: string, name: string }`。
- 権限 = 認証不要。
- バリデーション (zod、`lib/schemas/auth.ts` の `parseSignup`)。
  - `email` = 文字列 (invalid_type)、空文字は required、`§ email バリデーション` で invalid_format 判定。
  - `password` = 文字列 (invalid_type)、空文字は required、8 文字未満は too_short、英字 / 数字 / 記号を含まない場合 weak。
  - `name` = 文字列 (invalid_type)、トリム後 0 文字は required、101 文字以上は too_long。
- 処理。
  1. body を zod 検証。
  2. `emailLower = email.toLowerCase()`。
  3. `prisma.user.findUnique({ where: { email: emailLower } })` で重複判定、存在すれば `ConflictError({ email: "already_registered" })`。
  4. `passwordHash = await bcrypt.hash(password, 10)`。
  5. `user = prisma.user.create({ data: { email: emailLower, passwordHash, name: name.trim() } })`。
  6. `session = createSession(user.id)` (`§ session ユーティリティ`)。
  7. `NextResponse.json({ user: { id, email, name } }, { status: 201 })` + `Set-Cookie` header で Cookie を設定。
- 出力 = `201 { user }` + `Set-Cookie: sid=<sessionId>; HttpOnly; SameSite=Lax; ...`。
- ステータス = `201` / `409` / `422`。
- ログ = `event=auth.signup`、`actorId=user.id`、`targetType=user`、`targetId=user.id`、`context={ sessionIdPrefix: sessionId.slice(0, 8) }`。

### `POST /api/auth/login` ログイン

- 入力 body = `{ email: string, password: string }`。
- 権限 = 認証不要。
- バリデーション (zod、`parseLogin`)。email / password の存在と型のみ検証、強度 / メール形式は検証しない (「無効な形式」 の露出防止)。
- 処理。
  1. body を zod 検証。invalid_type / required は `422` に返す (認証失敗経路とは別)。
  2. `emailLower = email.toLowerCase()`。
  3. `user = prisma.user.findUnique({ where: { email: emailLower } })`、存在しない場合 (`§ セキュリティ § invalid_credentials`) の分岐に進む。
  4. `user` が存在すれば `await bcrypt.compare(password, user.passwordHash)`。
  5. `user` が存在しない or password 不一致の場合、`InvalidCredentialsError` (下記参照) を throw。
  6. 一致すれば `session = createSession(user.id)`。
  7. `NextResponse.json({ user: { id, email, name } })` + `Set-Cookie`。
- 出力 = `200 { user }` + `Set-Cookie`。
- ステータス = `200` / `401 invalid_credentials` / `422`。
- ログ = 成功時 `event=auth.login`、失敗時 `event=auth.login`、`level=warn`、`actorId=null`、`context.email` は含めない (`spec/011_auth.md § 非機能要件 § セキュリティ`)。

### `POST /api/auth/logout` ログアウト

- 入力 = なし。
- 権限 = 認証不要 (冪等)。
- 処理。
  1. `sid = request.cookies.get("sid")?.value`。
  2. `sid` があれば `prisma.session.deleteMany({ where: { id: sid } })` (存在しない場合も deleteMany なので safe)。
  3. `NextResponse.json(null, { status: 204 })` + `Set-Cookie: sid=; Max-Age=0; ...`。
- 出力 = `204` (body なし) + `Set-Cookie` で Cookie 失効。
- ステータス = `204`。
- ログ = `event=auth.logout`、`actorId=user?.id ?? null`、`targetType=user`。

### `GET /api/auth/me` 現在ユーザー取得

- 入力 = なし。
- 権限 = ログイン済み。
- 処理。
  1. `user = await requireCurrentUser(request)`、未認証なら `401`。
  2. `NextResponse.json({ user: { id, email, name } })`。
- 出力 = `200 { user }`。
- ステータス = `200` / `401`。
- ログ = `event=auth.me`。

### `POST /api/auth/refresh` セッション延長

- 入力 = なし。
- 権限 = ログイン済み。
- 処理。
  1. `user = await requireCurrentUser(request)`、未認証なら `401`。
  2. `oldSid = request.cookies.get("sid")!.value` (認証通過時点で必ず存在)。
  3. `prisma.$transaction([ prisma.session.delete({ where: { id: oldSid } }), createSession(user.id) as any ])` で旧 Session 破棄 + 新規発行を atomic に実施。
  4. `NextResponse.json({ user: { id, email, name } })` + 新 `Set-Cookie`。
- 出力 = `200 { user }` + 新 Cookie。
- ステータス = `200` / `401`。
- ログ = `event=auth.refresh`。

### session ユーティリティ

`lib/auth/session.ts` に以下を配置する。

```ts
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 日
export const SESSION_COOKIE_NAME = "sid";

export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return prisma.session.create({ data: { id, userId, expiresAt } });
}

export function buildSessionCookie(sessionId: string): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function buildLogoutCookie(): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
```

### `getCurrentUser(request)` の実装差し替え

`lib/auth/currentUser.ts` を以下に置き換える。

```ts
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { User } from "@prisma/client";

export async function getCurrentUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sid = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name && v) return decodeURIComponent(v);
  }
  return null;
}
```

- 期限切れ Session は `null` を返し、`requireCurrentUser` で `401` に変換される (`§ Route Handler の実装`)。
- 期限切れ Session の DB 削除は本 spec の対象外 (別途 cleanup)。
- `getDefaultUser()` は本 spec で廃止する (UI Server Component は Cookie ベースの認証に置き換える、`§ UI 構造`)。

### `InvalidCredentialsError` の追加

`lib/http/errors.ts` に以下を追加する。

```ts
export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid_credentials");
    this.name = "InvalidCredentialsError";
  }
}

export function invalidCredentials() {
  return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
}
```

`lib/http/withApiHandler.ts` に `InvalidCredentialsError` の分岐を追加する (`status=401`、`errorCode=invalid_credentials`、`level=warn`)。既存の `UnauthorizedError` (`401 unauthorized`) とは body / errorCode が異なる。

### `ConflictError` の追加 (`design/012_member_invite.md` と共有)

`lib/http/errors.ts` に以下を追加する。

```ts
export class ConflictError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("conflict");
    this.name = "ConflictError";
    this.fields = fields;
  }
}

export function conflictError(fields: Record<string, string>) {
  return NextResponse.json(
    { error: "conflict", fields },
    { status: 409 },
  );
}
```

`withApiHandler` に `ConflictError` の分岐を追加する (`status=409`、`errorCode=conflict`、`level=warn`)。

## UI 構造

### ページ (Server Component)

| パス | file | 責務 |
|---|---|---|
| `/signup` | `app/signup/page.tsx` | サインアップ画面。 form (Client Component) を配置。 |
| `/login` | `app/login/page.tsx` | ログイン画面。 form (Client Component) を配置。 |
| `/` | `app/page.tsx` (差替) | ボード一覧。 サーバー Component で `getCurrentUser` を呼び、未ログインなら `/login` にリダイレクト。 |
| `/boards/[boardId]` | (差替) | ボード詳細。 未ログインなら `/login` にリダイレクト、閲覧不可なら Next.js `notFound()`。 |

- Server Component から `getCurrentUser` を呼ぶには `next/headers` の `cookies()` を使う。`request.headers` に相当する経路を Server Component 内で構築する helper (`lib/auth/currentUserFromCookies.ts`) を追加する。
- 未ログインリダイレクトは `redirect("/login")` を Server Component で呼ぶ。

```ts
// lib/auth/currentUserFromCookies.ts (Server Component 専用)
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function getCurrentUserFromCookies() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sid) return null;
  const s = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!s || s.expiresAt.getTime() <= Date.now()) return null;
  return s.user;
}
```

### 主要 Client Component

| コンポーネント | 責務 |
|---|---|
| `SignupForm` | `email` / `password` / `name` の入力 form。 送信で `POST /api/auth/signup` を叩き、成功時に `router.push("/")` する。 |
| `LoginForm` | `email` / `password` の入力 form。 送信で `POST /api/auth/login` を叩き、成功時に `router.push("/")` する。 |
| `LogoutButton` | ヘッダーに配置。 `POST /api/auth/logout` を叩き、成功時に `router.push("/login")` する。 |

- form のバリデーションは client 側で最低限 (空文字チェック) のみ行い、詳細は server 側のレスポンスに従う。
- API レスポンスの `422` は fields ごとに form 下部に表示、`401 invalid_credentials` は「メールアドレスまたはパスワードが正しくありません」 の統一メッセージ、`409` は「このメールアドレスは既に登録されています」 を表示する。

### `apiFetch` の変更

`lib/client/apiFetch.ts` から `X-User-Id` header 付与を廃止する。fetch は same-origin 経路で Cookie を自動送信するため、追加 header は不要。

```ts
"use client";

export async function apiFetch(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (
    init?.body !== undefined &&
    !headers.has("content-type") &&
    typeof init.body === "string"
  ) {
    headers.set("content-type", "application/json");
  }
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
```

## 状態遷移

### エンティティ状態

Session (1 セッションあたり)。

```
[未発行]           --POST /api/auth/signup or login-->        [有効 (expiresAt 未来)]
[有効]             --POST /api/auth/refresh-->                 [破棄] + [有効 (新)]
[有効]             --POST /api/auth/logout-->                  [削除]
[有効]             --Time.now >= expiresAt-->                  [期限切れ (未削除 / 論理無効)]
[期限切れ]         --POST /api/auth/refresh-->                 [401 (getCurrentUser が null)]
```

User の認証状態 (Client 視点)。

```
[未ログイン]  --POST /api/auth/signup 成功-->  [ログイン中 (新規 User)]
[未ログイン]  --POST /api/auth/login 成功-->   [ログイン中]
[ログイン中]  --POST /api/auth/logout-->        [未ログイン]
[ログイン中]  --POST /api/auth/refresh-->       [ログイン中 (Cookie 更新)]
[ログイン中]  --Session 期限切れ-->             [未ログイン (次回 API で 401)]
```

### UI 状態遷移

```
/login (未ログイン) → LoginForm 入力 → 送信 → submitting → success (router.push("/")) → /
                                                            ↘ error(401) → inline error → 再入力可能
                                                            ↘ error(422) → field error → 再入力可能

/signup (未ログイン) → SignupForm 入力 → 送信 → submitting → success (router.push("/")) → /
                                                              ↘ error(409) → inline error → 再入力可能
                                                              ↘ error(422) → field error → 再入力可能

Header の LogoutButton → 送信 → success → router.push("/login") → /login
```

## 非機能の実装方針

### 性能

- サインアップ / ログイン API は bcrypt のハッシュ生成 / 比較を含むため P95 300ms 以内は cost=10 での目安 100ms 前後で余裕。
- `getCurrentUser` は Session を 1 件 SELECT する 1 クエリのみ。`@@index([userId])` は future の直接 userId 引きに使う (本 spec では未使用、`design/013_permissions.md` で使う)。
- Cookie ベースのため、Client Component 側で余分な header 付与不要。

### セキュリティ

- パスワードは `bcryptjs` (cost=10) でハッシュ化する。ハッシュ結果を DB 保存、生パスワードはメモリ / ログ / DB のいずれにも残さない。
- 認証失敗時に「メールアドレス未登録」 と「パスワード不一致」 の区別を返さない。両者とも `401 invalid_credentials` を返す (`spec/011_auth.md § 非機能要件`)。
- `email` は保存時 / 検索時ともに小文字化する。UI 表示は入力時のケースを保持しない (常に小文字で扱う)。
- Cookie は `HttpOnly` + `SameSite=Lax` を default とする。本番環境では `Secure` を追加する。
- Cookie の `sid` 値は 32 byte 相当の crypto ランダム (`crypto.randomBytes`)、43 文字前後の URL-safe 文字列。予測困難。
- 認証失敗ログには `email` を残さない。`actorId=null` で warn 記録。
- パスワードの上限は 200 文字 (bcrypt の 72 byte 制約対策で、実質 72 byte を超える部分は bcrypt が truncate するが、明示上限で切る)。
- 認証 API の全レスポンスに `Cache-Control: no-store` を付ける (`next.config.ts` レベルではなく Route Handler ごとに header 付与)。

### 運用 (操作ログ)

- サインアップ / ログイン / ログアウト / リフレッシュの各操作について、成功時 `event=auth.{name}` を info で残す。
- 認証失敗 (`invalid_credentials`) は `warn`、`actorId=null`、`context.email` は含めない。
- `sid` の平文はログに残さず、頭 8 文字のプレフィックス (`context.sessionIdPrefix`) のみ残す。
- `withApiHandler` の catch 経路で認証系エラー (`InvalidCredentialsError` / `UnauthorizedError` / `ConflictError` / `ValidationError`) を level=warn、`5xx` を level=error で記録する。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `POST /api/auth/signup` | zod → email 重複 → hash → user.create → session.create | `422` / `409` |
| `POST /api/auth/login` | zod → user.findUnique → bcrypt.compare → session.create | `422` / `401 invalid_credentials` |
| `POST /api/auth/logout` | (認証チェックなし、冪等) | 常に `204` |
| `GET /api/auth/me` | `requireCurrentUser` | `401 unauthorized` |
| `POST /api/auth/refresh` | `requireCurrentUser` → session.delete + session.create | `401 unauthorized` |

- サインアップ / ログイン / ログアウトは認証不要。他の認証必須 API 全般は `requireCurrentUser` を通す。
- `getCurrentUser` の返り値が `null` の時、`requireCurrentUser` は `UnauthorizedError` を throw、`withApiHandler` が `401` に変換する (既存経路と同じ)。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `auth.signup` 成功 | `info` | `actorId=user.id`、`targetType=user`、`targetId=user.id`、`context={ sessionIdPrefix }`、`status=201` |
| `auth.login` 成功 | `info` | `actorId=user.id`、`context={ sessionIdPrefix }`、`status=200` |
| `auth.login` 失敗 | `warn` | `actorId=null`、`context.email` 除外、`status=401`、`errorCode="invalid_credentials"` |
| `auth.logout` | `info` | `actorId=user?.id ?? null`、`status=204` |
| `auth.me` | `info` | `actorId=user.id`、`status=200` |
| `auth.refresh` | `info` | `actorId=user.id`、`context={ oldSessionIdPrefix, newSessionIdPrefix }`、`status=200` |
| 全操作の `422` | `warn` | `context.fields` に検証失敗 field |
| 全操作の `5xx` | `error` | `context.stack` |

- `TargetType` union に `"user"` を追加する (`lib/log/audit.ts`)。既存の board / list / card / comment のログには影響しない。

## テスト方針

### Vitest 構成

- **単体テスト** … zod schema (`parseSignup` / `parseLogin`)、Cookie 生成ヘルパ (`buildSessionCookie` / `buildLogoutCookie`)、パスワード強度判定 (`isPasswordStrong`)。
- **Route Handler テスト** (優先度中、SQLite テスト DB helper 未整備のため本 TDD スコープではスキップ) … 独立 SQLite テスト DB。サインアップ → ログイン → me → logout → 401 の E2E フロー、認証失敗の統一エラー、Cookie 属性の確認。
- **UI テスト** (優先度低) … `SignupForm` / `LoginForm` の主要遷移、422 field error 表示。

### ケース一覧 (spec/011_auth.md § 受入条件 との対応)

| 種別 | ケース例 | 対応 spec 節 |
|---|---|---|
| 正常系 (schema) | `{ email: "u@e.com", password: "Abc123!!", name: "N" }` → 受理 | § FR-01 / § バリデーション |
| バリデーション (schema) | `{}` → `422 required` (3 field) / `{ password: "abc" }` → `too_short` / `{ password: "abcdefgh" }` → `weak` / `{ email: "not-mail" }` → `invalid_format` / `{ name: "a".repeat(101) }` → `too_long` | § バリデーション |
| 境界 (schema) | `{ password: "Abc123!!" }` (8 文字下限) / `{ name: "a" }` (1 文字下限) / `{ name: "a".repeat(100) }` (100 文字上限) | § 境界条件 |
| パスワード強度 (pure) | `Abc12345` (英+数、記号なし) → weak / `Abc!!!!!` (英+記号、数字なし) → weak / `12345!!!` (数+記号、英なし) → weak / `Abc123!!` (3 種含む) → OK | § 境界条件 |
| Cookie 生成 (pure) | prod で `Secure` 付き、dev で `Secure` なし、logout Cookie は `Max-Age=0` を含む | § 共通の Cookie 属性 |
| 正常系 (Route Handler、後続) | signup → me → 200、login → me → 200、logout → me → 401、refresh 後の旧 Cookie で me → 401 | § FR-01 - FR-06 |
| 認証失敗 (後続) | 未登録 email で login → 401 (invalid_credentials)、正しい email + 誤 password → 401 | § 異常系 |
| 重複 (後続) | 同じ email で signup 2 回目 → 409 | § FR-01 |

### 補助ヘルパ

- `tests/schemas/auth.test.ts` に `parseSignup` / `parseLogin` の pure 単体テストを配置する。
- `tests/auth/session.test.ts` に Cookie 生成 helper と generateSessionId のテストを配置する (crypto は Vitest 内で real 実装を使う)。
- `tests/auth/passwordStrength.test.ts` に `isPasswordStrong` の 8 境界テストを配置する。

## 実装方針 (本設計で固定する判断)

- パスワードハッシュは `bcryptjs` (cost=10) を採用する。`bcrypt` (native) は node-gyp / OS 依存で環境差が出るためハンズオンでは避ける。
- Session は Cookie ベース (DB Session テーブル、`sid` を Cookie で送る) に固定する。JWT は不採用 (revoke 経路の複雑化を避ける、リフレッシュ経路が明確になる)。
- Session の有効期限は 7 日 default、絶対期限とし、相対 (アクセスごとに延長) は本 spec 対象外。延長は `POST /api/auth/refresh` の明示呼出のみ。
- Cookie 属性は `HttpOnly` + `SameSite=Lax` + `Secure` (本番のみ) の 3 種を default。
- `email` は小文字化して DB 保存 / 検索する。UI 表示も小文字。
- `X-User-Id` header 経路は完全に廃止する (`lib/auth/currentUser.ts` / `lib/client/apiFetch.ts` から削除)。
- サインアップ / ログインの認証失敗は `401 invalid_credentials` の統一 code を返し、フィールド別のヒント (`email not found` 等) を漏らさない。
- 認証失敗ログには `email` を残さず、`actorId=null` + `errorCode=invalid_credentials` で記録する。

## 実装順序

1. **Prisma schema 拡張と migration**
   - `User` に `email` / `passwordHash` を追加 (既存 User テーブルは seed で default user 1 名のみのため、初期化して migration を流す)。
   - `Session` モデルを新設。
   - `prisma migrate dev --name add_auth` を流す。
   - 既存 seed (`prisma/seed.ts`) を書き換え、default user に `email = "default@example.com"` / `password = "Default!123"` (hash 化) を設定する。
2. **共通ユーティリティ**
   - `lib/http/errors.ts` に `InvalidCredentialsError` / `invalidCredentials()` / `ConflictError` / `conflictError()` を追加。
   - `lib/log/audit.ts` の `TargetType` に `"user"` を追加、`errorCode` union に `"invalid_credentials"` / `"conflict"` を追加。
   - `lib/http/withApiHandler.ts` に `InvalidCredentialsError` / `ConflictError` の分岐を追加。
   - `lib/auth/session.ts` (`generateSessionId` / `createSession` / `buildSessionCookie` / `buildLogoutCookie`) を実装。
   - `lib/auth/passwordStrength.ts` に `isPasswordStrong(password)` を実装 (英字 / 数字 / 記号のうち 3 種を全て含む判定)。
   - `lib/schemas/auth.ts` に `parseSignup(body)` / `parseLogin(body)` を実装。
   - `lib/auth/currentUser.ts` を Cookie ベース (`getCurrentUser`) に書き換え、`getDefaultUser` を削除。
   - `lib/auth/currentUserFromCookies.ts` (Server Component 用) を新設。
   - `lib/client/apiFetch.ts` から `X-User-Id` header 付与を削除、`credentials: "same-origin"` を追加。
3. **Route Handler 実装**
   - `app/api/auth/signup/route.ts` → `login` → `logout` → `me` → `refresh` の順で実装する。各 endpoint は `spec/000_shared_rules.md § Route Handler の入口チェック順序` に従う。
4. **UI 実装**
   - `app/signup/page.tsx` + `components/auth/SignupForm.tsx`。
   - `app/login/page.tsx` + `components/auth/LoginForm.tsx`。
   - `components/auth/LogoutButton.tsx` を新設し、`app/page.tsx` ヘッダーに配置。
   - `app/page.tsx` の `getDefaultUser` 呼出を `getCurrentUserFromCookies` に置き換え、未ログインは `redirect("/login")`。
   - `app/boards/[boardId]/page.tsx` も同様に置換。
5. **既存 seed の書き換え**
   - `prisma/seed.ts` を書き換え、default user に email + hashed password を設定する。
6. **テスト整備**
   - `tests/schemas/auth.test.ts` / `tests/auth/session.test.ts` / `tests/auth/passwordStrength.test.ts` の 3 pure 単体テスト。
   - 既存 `tests/auth/canDeleteComment.test.ts` は本 spec 変更の影響なし (pure 関数のため)。

## Red-Green-Refactor で扱う FR の順番

TDD (`/tdd` skill) で以下の順に Red-Green-Refactor を回す。

1. **パスワード強度判定 pure 関数** (`isPasswordStrong`)
   - Red = 8 文字未満 / 英字のみ / 数字のみ / 記号なし / 3 種含む の 5 パターンで assert。
   - Green = `lib/auth/passwordStrength.ts` を実装。
   - Refactor = 判定順序を「長さ → 種類」 に固定 (short-circuit)。
2. **サインアップ schema** (`parseSignup`)
   - Red = 空 body、各 field 未指定、invalid_type、too_short、weak、too_long、invalid_format の各ケース。
   - Green = `lib/schemas/auth.ts` を実装。
   - Refactor = `runSchema` helper (`design/010_comment.md` と同形) を共通化。
3. **Cookie 生成 pure 関数**
   - Red = prod / dev で `Secure` 付与切替、logout Cookie は `Max-Age=0`。
   - Green = `lib/auth/session.ts` の 2 helper を実装。
   - Refactor = 共通配列組立を切り出す。
4. **ログイン schema** (`parseLogin`)
   - Red = email / password 未指定、invalid_type。
   - Green = `parseSignup` から派生。
   - Refactor = 共通 zod primitive を切り出す。
5. **Route Handler は SQLite テスト DB helper 整備後 (別 PR、本 TDD スコープ外)。**

## 作成または更新したファイル

- `design/011_auth.md` (新規作成)
