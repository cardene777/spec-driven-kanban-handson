# メンバー招待機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/011_auth.md`
- `spec/012_member_invite.md`
- `spec/013_permissions.md`

## 前提

Prisma 全体スキーマ、認証・認可の共通ユーティリティ (`requireCurrentUser` / `assertBoardAccess` / `getBoardRole`)、エラーレスポンスヘルパ、監査ログ形式、バリデーション方針 (zod)、`withApiHandler` は `design/001_boards.md § 共通設計方針` を参照する。
認証機構と `ConflictError` / `conflictError()` は `design/011_auth.md § InvalidCredentialsError の追加` / `§ ConflictError の追加` を継承する。
本 file は `spec/012_member_invite.md` を満たすメンバー招待機能 (作成 / 閲覧 / 承認 / 再送 / 失効) の設計に閉じる。

## 既存設計との差分

- `spec/000_shared_rules.md § HTTP ステータスコード` の 4 種 (401/403/404/422) に加え、`409 Conflict` (承認ユーザーが既にメンバー) と `410 Gone` (期限切れ / 使用済み / 失効済み) を追加する。`409` は `design/011_auth.md` と共有、`410` は本設計で新規追加する。
- `TargetType` に `"invite"` を追加する (`lib/log/audit.ts`)。

## データモデル

### Invite モデル (新設)

`prisma/schema.prisma` に以下を追加する。

```prisma
enum InviteStatus {
  pending
  accepted
  revoked
}

model Invite {
  id         String       @id @default(cuid())
  boardId    String
  email      String
  role       Role
  tokenHash  String       @unique
  status     InviteStatus @default(pending)
  expiresAt  DateTime
  invitedBy  String
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  board   Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  inviter User  @relation("InviterUser", fields: [invitedBy], references: [id], onDelete: Cascade)

  @@index([boardId, status])
  @@index([email])
}
```

- `tokenHash` はハッシュ化した `token` を保存する。ハッシュは `SHA-256` (`crypto.createHash("sha256").update(token).digest("hex")`)。`bcrypt` は不採用 (見つからないトークンで DB 全件を bcrypt.compare するのは非現実的、SHA-256 は 1 回のハッシュで DB 検索できる)。
- `tokenHash` に `@unique` を付与し、DB 制約で一意性を担保する。
- `(boardId, email)` の `status = pending` 一意は Prisma スキーマでは制約できない (partial unique index が SQLite で表現しづらいため)。アプリ層で count 検証する (`§ POST の実装`)。
- `onDelete: Cascade` により Board 削除で招待も自動削除される。
- `invitedBy` で招待作成者を追跡できる。

### Board / User モデルへの relation 追加

```prisma
model Board {
  // 既存フィールド ...
  invites Invite[]
}

model User {
  // 既存フィールド ...
  invitesSent Invite[] @relation("InviterUser")
}
```

### JSON 表現

Invite (owner 用 API のレスポンス、`tokenHash` は返さない)。

```json
{
  "id": "clx...",
  "boardId": "clx...board",
  "email": "invitee@example.com",
  "role": "member",
  "status": "pending",
  "expiresAt": "2026-07-19T10:00:00.000Z",
  "invitedBy": "usr_owner",
  "createdAt": "2026-07-12T10:00:00.000Z",
  "updatedAt": "2026-07-12T10:00:00.000Z"
}
```

- 招待作成 / 再送のレスポンスは `{ invite: Invite, token: <平文>, url: "/invites/{token}" }`。`token` は平文のみをこのレスポンスで 1 度返し、以降 API では取得できない。
- 招待閲覧 API のレスポンスは `{ boardId, boardTitle, role, status, expiresAt, expired }` (`email` / `invitedBy` は含めない、`tokenHash` も含めない)。
- 承認 API のレスポンスは `{ boardId, role }`。
- 失効 API のレスポンスは `{ invite: { id, status } }`。
- 招待一覧 API のレスポンスは `{ items: Invite[] }` (`tokenHash` を除く全 field)。

### 補助関数

`lib/invites/token.ts` に以下を配置する。

```ts
import { createHash, randomBytes } from "crypto";

export const INVITE_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 日

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url"); // 32 文字前後の URL-safe 文字列
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + INVITE_EXPIRES_MS);
}

export function isExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
```

- `generateInviteToken` は 24 byte のランダム (base64url で 32 文字前後)。文字集合は `[A-Za-z0-9_-]` のみ (URL-safe)。
- `hashInviteToken` は SHA-256。`tokenHash` は 64 文字の hex。
- `inviteExpiresAt` は現在時刻 + 7 日 (再送時も同じ計算を使う)。
- `isExpired` は経過判定の pure 関数 (単体テスト対象)。

## API 設計

`spec/012_member_invite.md § API` の 6 endpoint を Route Handler で実装する。file 配置。

- `app/api/boards/[boardId]/invites/route.ts` … `GET` / `POST`
- `app/api/boards/[boardId]/invites/[inviteId]/resend/route.ts` … `POST`
- `app/api/boards/[boardId]/invites/[inviteId]/revoke/route.ts` … `POST`
- `app/api/invites/[token]/route.ts` … `GET`
- `app/api/invites/[token]/accept/route.ts` … `POST`

### `GET /api/boards/{boardId}/invites` 一覧取得

- 入力 = パスパラメータ `boardId`。
- 権限 = 対象ボードの `owner`。
- 処理。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `assertBoardAccess(user.id, boardId, "owner")`、`owner` 以外は `403`、未参加は `404`。
  3. `prisma.invite.findMany({ where: { boardId, status: "pending" }, orderBy: [{ createdAt: "desc" }] })`。
- 出力 = `200 { items: Invite[] }` (各要素から `tokenHash` を除外)。
- ステータス = `200` / `401` / `403` / `404`。
- ログ = `event=invite.list`、`targetType=invite`、`context={ boardId, count }`。

### `POST /api/boards/{boardId}/invites` 招待作成

- 入力 = パスパラメータ `boardId`、body = `{ email: string, role: "member" | "viewer" }`。
- 権限 = 対象ボードの `owner`。
- バリデーション (zod、`lib/schemas/invites.ts` の `parseInviteCreate`)。
  - `email` = 文字列、空文字は required、メール形式でないと invalid_format。
  - `role` = 文字列、`"member"` / `"viewer"` のみ受理、`"owner"` を含む他値は invalid_value。
- 処理 (1 トランザクション、`prisma.$transaction`)。
  1. body を zod 検証、`emailLower = email.toLowerCase()`。
  2. `assertBoardAccess(user.id, boardId, "owner")`。
  3. `existingMember = tx.user.findFirst({ where: { email: emailLower }, select: { id: true } })` → `member = existingMember ? tx.boardMembership.findUnique({ where: { boardId_userId: { boardId, userId: existingMember.id } } }) : null` → `member` が存在すれば `422 { email: "already_member" }`。
  4. `pending = tx.invite.count({ where: { boardId, email: emailLower, status: "pending" } })` → `pending > 0` なら `422 { email: "pending_exists" }`。
  5. `token = generateInviteToken()`、`tokenHash = hashInviteToken(token)`、`expiresAt = inviteExpiresAt()`。
  6. `invite = tx.invite.create({ data: { boardId, email: emailLower, role, tokenHash, expiresAt, invitedBy: user.id } })`。
  7. URL 生成 = `` `${process.env.APP_BASE_URL ?? ""}/invites/${token}` ``。
- 出力 = `201 { invite: <tokenHash 除外>, token, url }` + `Cache-Control: no-store` header。
- ステータス = `201` / `401` / `403` / `404` / `422`。
- ログ = `event=invite.create`、`targetType=invite`、`targetId=invite.id`、`context={ boardId, email: emailLower, role }` (email は owner にとって既知の情報のためログに残す、`token` / `tokenHash` は残さない)。

### `POST /api/boards/{boardId}/invites/{inviteId}/resend` 再送

- 入力 = パスパラメータ `boardId` / `inviteId`。body なし。
- 権限 = 対象ボードの `owner`。
- 処理 (1 トランザクション)。
  1. `assertBoardAccess(user.id, boardId, "owner")`。
  2. `invite = tx.invite.findUnique({ where: { id: inviteId } })`、未存在または `boardId` 不一致は `404`。
  3. `invite.status !== "pending"` なら `422 { status: "not_pending" }`。
  4. 新 `token = generateInviteToken()`、`tokenHash = hashInviteToken(token)`、`expiresAt = inviteExpiresAt()`。
  5. `updated = tx.invite.update({ where: { id: inviteId }, data: { tokenHash, expiresAt } })`。
- 出力 = `200 { invite: <tokenHash 除外>, token, url }` + `Cache-Control: no-store`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=invite.resend`、`targetId=invite.id`、`context={ boardId, email, newExpiresAt }`。

### `POST /api/boards/{boardId}/invites/{inviteId}/revoke` 失効

- 入力 = パスパラメータ `boardId` / `inviteId`。body なし。
- 権限 = 対象ボードの `owner`。
- 処理 (1 トランザクション)。
  1. `assertBoardAccess(user.id, boardId, "owner")`。
  2. `invite = tx.invite.findUnique({ where: { id: inviteId } })`、未存在または `boardId` 不一致は `404`。
  3. `invite.status !== "pending"` なら `422 { status: "not_pending" }`。
  4. `updated = tx.invite.update({ where: { id: inviteId }, data: { status: "revoked" } })`。
- 出力 = `200 { invite: { id, status: "revoked" } }`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=invite.revoke`、`targetId=invite.id`、`context={ boardId, email }`。

### `GET /api/invites/{token}` 招待閲覧

- 入力 = パスパラメータ `token` (平文)。
- 権限 = 認証不要。
- 処理。
  1. `tokenHash = hashInviteToken(token)`。
  2. `invite = prisma.invite.findUnique({ where: { tokenHash }, include: { board: { select: { id: true, title: true } } } })`、未存在なら `404`。
  3. `expired = isExpired(invite.expiresAt)`。
- 出力 = `200 { boardId, boardTitle, role, status, expiresAt, expired }` + `Cache-Control: no-store`。
- ステータス = `200` / `404`。
- ログ = `event=invite.view`、`targetType=invite`、`targetId=invite.id`、`context={ boardId, status, expired }` (未認証のため `actorId=null`)。

### `POST /api/invites/{token}/accept` 招待承認

- 入力 = パスパラメータ `token`。body なし。
- 権限 = ログイン済み。
- 処理 (1 トランザクション)。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `tokenHash = hashInviteToken(token)`。
  3. `invite = tx.invite.findUnique({ where: { tokenHash } })`、未存在なら `404`。
  4. 判定。
     - `invite.status === "accepted"` → `410 { reason: "already_used" }`
     - `invite.status === "revoked"` → `410 { reason: "revoked" }`
     - `isExpired(invite.expiresAt)` → `410 { reason: "expired" }`
  5. `existing = tx.boardMembership.findUnique({ where: { boardId_userId: { boardId: invite.boardId, userId: user.id } } })` → 存在すれば `409 { userId: "already_member" }` (招待の status は変更しない)。
  6. `tx.boardMembership.create({ data: { boardId: invite.boardId, userId: user.id, role: invite.role } })`。
  7. `tx.invite.update({ where: { id: invite.id }, data: { status: "accepted" } })`。
- 出力 = `200 { boardId, role }` + `Cache-Control: no-store`。
- ステータス = `200` / `401` / `404` / `409` / `410`。
- ログ = `event=invite.accept`、`targetId=invite.id`、`actorId=user.id`、`context={ boardId, role, invitedBy: invite.invitedBy }`。

### 追加のエラーヘルパ

`lib/http/errors.ts` に以下を追加する。

```ts
export class GoneError extends Error {
  reason: "expired" | "already_used" | "revoked";
  constructor(reason: "expired" | "already_used" | "revoked") {
    super("gone");
    this.name = "GoneError";
    this.reason = reason;
  }
}

export function gone(reason: "expired" | "already_used" | "revoked") {
  return NextResponse.json({ error: "gone", reason }, { status: 410 });
}
```

`withApiHandler` に `GoneError` の分岐を追加する (`status=410`、`errorCode=gone`、`level=warn`)。`errorCode` union に `"gone"` を追加。

## UI 構造

### ページ (Server Component)

| パス | file | 責務 |
|---|---|---|
| `/invites/[token]` | `app/invites/[token]/page.tsx` | 招待閲覧 + 承認画面。 サーバー側で `GET /api/invites/{token}` 相当を実行し、`InviteAcceptPanel` (Client Component) に渡す。 |

- ボード詳細画面 (`app/boards/[boardId]/page.tsx`) にはメンバー管理領域を追加し、招待一覧 / 作成 form / 再送 / 失効ボタンを配置する (詳細は `design/013_permissions.md` の管理領域と結合)。

### 主要 Client Component

| コンポーネント | 責務 |
|---|---|
| `InviteCreateForm` | `email` / `role` の入力 form。 送信で `POST /api/boards/{boardId}/invites` を叩き、成功時に招待 URL を表示する (コピーボタン)。 |
| `InviteList` | 対象ボードの `pending` 招待一覧。 各行に再送 / 失効ボタンを配置。 |
| `InviteAcceptPanel` | 招待閲覧 + 承認画面。 未ログインなら「ログインして承認」 導線を表示、ログイン中なら「承認する」 ボタンを表示、`POST /api/invites/{token}/accept` を叩く。 |

### 領域内の状態

- `InviteCreateForm` = `idle → submitting → success (URL 表示) | error(inline: 422 / 403)`。
- `InviteList` = `idle → loading → success (items=[] なら empty) | error`。
- `InviteAcceptPanel` = `viewing → accepting → success (router.push("/boards/{boardId}")) | error(410/409/401)`。

### 招待 URL の表示

- 招待作成 form の成功時、`{ url }` を text field + コピーボタンで表示する (メール送信は本 spec 対象外、`spec/012_member_invite.md § 未決事項`)。
- 表示は 1 回限りで、モーダルを閉じると再表示不可 (再送すれば新 URL が発行される)。

## 状態遷移

### エンティティ状態

Invite (1 招待あたり)。

```
[未存在]              --POST create-->                      [pending, tokenHash=A, expires=t+7d]
[pending, tokenHash=A]--POST resend-->                      [pending, tokenHash=B, expires=t2+7d]  (A は無効化)
[pending]             --POST revoke-->                      [revoked]
[pending]             --POST accept (期限内、非メンバー)--> [accepted] + BoardMembership 追加
[pending]             --POST accept (期限切れ)-->           [pending]  (副作用なし、410 expired)
[pending]             --POST accept (既メンバー)-->         [pending]  (副作用なし、409 already_member)
[revoked]             --POST accept-->                      [revoked]  (副作用なし、410 revoked)
[accepted]            --POST accept-->                      [accepted] (副作用なし、410 already_used)
[expiresAt < now]     (時間経過)                            [pending]  (status は変更しない、GET で expired: true)
```

### UI 状態遷移 (招待画面)

```
/invites/{token} 訪問 → InviteAcceptPanel (viewing)
  - 未ログイン → 「ログインして承認」 → /login?returnTo=/invites/{token} → login 成功 → /invites/{token}
  - ログイン中 + 有効 → 「承認する」 → accepting → success (router.push("/boards/{boardId}"))
                                                    ↘ error(410 expired) → 「期限切れ」 表示
                                                    ↘ error(410 revoked) → 「失効済み」 表示
                                                    ↘ error(410 already_used) → 「使用済み」 表示
                                                    ↘ error(409 already_member) → 「既にメンバー」 + ボード遷移導線
```

## 非機能の実装方針

### 性能

- 招待一覧は `@@index([boardId, status])` で高速。100 件未満想定。
- 招待閲覧は `tokenHash` の `@unique` で 1 件 SELECT。
- 承認は 1 トランザクション内で SELECT (invite) + SELECT (membership) + CREATE (membership) + UPDATE (invite) の 4 クエリ。P95 300ms 以内は SQLite で余裕。
- SHA-256 のハッシュ計算は 1 回あたり μs オーダー、影響なし。

### セキュリティ

- `token` は 24 byte のランダム (base64url で 32 文字前後、URL-safe)。予測困難性は crypto ライブラリに委ねる。
- DB には `tokenHash` (SHA-256、64 文字 hex) のみ保存。平文 `token` は API レスポンスで 1 度返した後、DB から取得できない。
- `token` は URL パスパラメータで受け渡す (query string 禁止、Referer 経由の漏洩防止)。
- 招待 API の全レスポンスに `Cache-Control: no-store` を付ける (Next.js の Route Handler で `NextResponse.json(..., { headers: { "Cache-Control": "no-store" } })` を明示)。
- 招待閲覧 API は認証不要だが、`email` / `tokenHash` / `invitedBy` はレスポンスに含めない (`boardId` / `boardTitle` / `role` / `status` / `expiresAt` / `expired` のみ)。ボード名は URL 保有者に公開される情報とみなす (`spec/012_member_invite.md § 非機能要件 § セキュリティ`)。
- 承認時、ログインユーザーの email と招待の email の一致を確認しない (`spec/012_member_invite.md § FR-03`、URL 保有 = 承認権利)。
- 招待作成時、大文字小文字の違いを吸収するため email を小文字化して保存 / 検索する。

### 運用 (操作ログ)

- 招待の作成 / 再送 / 失効 / 承認について、成功時 `event=invite.{name}` を info で残す。
- `token` の平文 / `tokenHash` の hex 値ともに操作ログに含めない。ログには `inviteId` のみ残す。
- 承認 API のログには `actorId` (承認ユーザー) と `context.invitedBy` (招待作成者) を分けて記録する。
- `409 already_member` / `410` 各 reason はいずれも `warn` レベルで記録する。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/boards/{boardId}/invites` | `requireCurrentUser` → `assertBoardAccess(actorId, boardId, "owner")` | 未認証 `401`、未存在 / 閲覧不可 `404`、`owner` 以外 `403` |
| `POST /api/boards/{boardId}/invites` | `requireCurrentUser` → `assertBoardAccess(actorId, boardId, "owner")` → zod → 既存メンバー判定 → pending 判定 → create | 未認証 `401`、`404` / `403`、`422` (`role invalid_value` / `email already_member` / `email pending_exists`) |
| `POST /api/boards/{boardId}/invites/{id}/resend` | `requireCurrentUser` → `assertBoardAccess(actorId, boardId, "owner")` → invite 存在 → status pending → token 再発行 → update | 未認証 `401`、`404` / `403`、`422 not_pending` |
| `POST /api/boards/{boardId}/invites/{id}/revoke` | 同上 → status pending → status=revoked | 同上 |
| `GET /api/invites/{token}` | tokenHash → invite 存在 | `404` |
| `POST /api/invites/{token}/accept` | `requireCurrentUser` → tokenHash → invite 存在 → status/期限判定 → 既メンバー判定 → membership + invite update | 未認証 `401`、`404` / `410` / `409` |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `invite.list` 成功 | `info` | `actorId`、`targetType=invite`、`targetId=null`、`context={ boardId, count }`、`status=200` |
| `invite.create` 成功 | `info` | `actorId`、`targetType=invite`、`targetId=invite.id`、`context={ boardId, email, role }`、`status=201` |
| `invite.resend` 成功 | `info` | `actorId`、`targetId=invite.id`、`context={ boardId, email, newExpiresAt }`、`status=200` |
| `invite.revoke` 成功 | `info` | `actorId`、`targetId=invite.id`、`context={ boardId, email }`、`status=200` |
| `invite.view` 成功 | `info` | `actorId=null`、`targetId=invite.id`、`context={ boardId, status, expired }`、`status=200` |
| `invite.accept` 成功 | `info` | `actorId=user.id`、`targetId=invite.id`、`context={ boardId, role, invitedBy }`、`status=200` |
| `invite.accept` 409/410 | `warn` | `actorId`、`targetId=invite.id`、`context.reason`、`errorCode=conflict`/`gone` |
| 全操作の `422` / `5xx` | `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成

- **単体テスト** … zod schema (`parseInviteCreate`)、トークン生成 / ハッシュ / 期限判定 (`generateInviteToken` / `hashInviteToken` / `isExpired`)。
- **Route Handler テスト** (優先度中、SQLite テスト DB helper 未整備のため本 TDD スコープではスキップ) … 独立 SQLite テスト DB。owner による作成 → 別ユーザー承認 → BoardMembership 追加を E2E 検証。410 の 3 reason (expired / revoked / already_used) を網羅。
- **UI テスト** (優先度低) … `InviteAcceptPanel` の 4 分岐 (未ログイン / 有効 / 期限切れ / 既メンバー) を検証。

### ケース一覧 (spec/012_member_invite.md § 受入条件 との対応)

| 種別 | ケース例 | 対応 spec 節 |
|---|---|---|
| 正常系 (schema) | `{ email: "a@b.com", role: "member" }` → 受理 / `role: "viewer"` → 受理 | § FR-01 / § バリデーション |
| バリデーション (schema) | `role: "owner"` → invalid_value / `role: "admin"` → invalid_value / `email: ""` → required / `email: "not-mail"` → invalid_format | § バリデーション |
| token 生成 (pure) | 生成された token が base64url 文字集合、32 文字前後 | § セキュリティ |
| tokenHash (pure) | 同じ token に対して安定なハッシュ、異なる token は異なるハッシュ | § セキュリティ |
| isExpired (pure) | `expiresAt = now - 1ms` → true / `expiresAt = now + 1min` → false | § 境界条件 |
| 正常系 (Route Handler、後続) | owner が作成 → 別 user がログイン → accept → BoardMembership 追加 | § FR-01 - FR-03 |
| 410 (後続) | expiresAt を過去に書き換えて accept → 410 expired / revoke 後 → 410 revoked / accept 済み → 410 already_used | § FR-03 |
| 409 (後続) | 既にメンバーのユーザーが accept → 409 already_member (invite status は pending のまま) | § FR-03 |
| 権限 (後続) | member が create → 403 / non-member が create → 404 | § 権限境界 |

### 補助ヘルパ

- `tests/schemas/invites.test.ts` に `parseInviteCreate` の pure 単体テスト。
- `tests/invites/token.test.ts` に `generateInviteToken` / `hashInviteToken` / `isExpired` の pure 単体テスト。
- `tests/helpers/factories.ts` (未整備) に `createInvite(board, email, role, {status?, expiresAt?})` を追加予定 (Route Handler テスト整備時)。

## 実装方針 (本設計で固定する判断)

- `token` は crypto ランダム 24 byte + base64url、DB には SHA-256 の hex を保存。
- 招待の有効期限は default 7 日 (`INVITE_EXPIRES_MS`)、再送で「現在時刻 + 7 日」 に更新。
- `(boardId, email, status=pending)` の一意はアプリ層 (count) で担保。DB partial unique index は SQLite で表現しづらいため採用しない。
- 承認時、招待の email とログインユーザーの email の一致確認は行わない (`spec/012_member_invite.md § FR-03`)。
- 承認ユーザーが既にメンバーの場合、`BoardMembership` を追加せず `409 already_member` を返し、招待の `status` は `pending` のまま (使い切らない)。
- 招待閲覧 API は認証不要、`email` / `tokenHash` / `invitedBy` はレスポンスから除外。
- 招待の物理削除経路は本 spec で提供しない (`accepted` / `revoked` の履歴を保持)。将来の cleanup job で扱う。
- 招待作成の `role` は `member` / `viewer` の 2 値のみ許容 (owner の招待による追加はしない、`spec/012_member_invite.md § FR-01`)。
- Board 削除で招待も cascade 削除 (`onDelete: Cascade`)。

## 実装順序

1. **`design/011_auth.md` の実装順序を先に完了させる**
   認証機構、`ConflictError`、`InvalidCredentialsError`、Cookie ベースの `getCurrentUser` が本設計の前提。
2. **Prisma schema 拡張と migration**
   - `InviteStatus` enum、`Invite` モデルを新設。
   - `Board` / `User` に relation 追加。
   - `prisma migrate dev --name add_invite` を流す。
3. **共通ユーティリティ**
   - `lib/http/errors.ts` に `GoneError` / `gone()` を追加。
   - `lib/log/audit.ts` の `TargetType` に `"invite"` を追加、`errorCode` union に `"gone"` を追加。
   - `lib/http/withApiHandler.ts` に `GoneError` の分岐を追加。
   - `lib/invites/token.ts` (`generateInviteToken` / `hashInviteToken` / `inviteExpiresAt` / `isExpired`) を実装。
   - `lib/schemas/invites.ts` に `parseInviteCreate(body)` を実装。
4. **Route Handler 実装**
   - `app/api/boards/[boardId]/invites/route.ts` (`GET` / `POST`) → resend → revoke → `/invites/[token]` (`GET`) → accept の順で実装する。
   - 各 endpoint は `spec/000_shared_rules.md § Route Handler の入口チェック順序` に従う。
5. **UI 実装**
   - `app/invites/[token]/page.tsx` + `components/invites/InviteAcceptPanel.tsx`。
   - `components/invites/InviteCreateForm.tsx` + `InviteList.tsx` をボード詳細画面に配置 (`design/013_permissions.md` の管理領域と統合)。
6. **テスト整備**
   - `tests/schemas/invites.test.ts` / `tests/invites/token.test.ts` の 2 pure 単体テスト。

## Red-Green-Refactor で扱う FR の順番

TDD (`/tdd` skill) で以下の順に Red-Green-Refactor を回す。

1. **招待 token 生成 / ハッシュ / 期限判定** (`generateInviteToken` / `hashInviteToken` / `isExpired`)
   - Red = token が base64url、hash が hex 64 文字、isExpired の境界 (等号ちょうどは true) を assert。
   - Green = `lib/invites/token.ts` を実装。
2. **招待作成 schema** (`parseInviteCreate`)
   - Red = `role: "owner"` → invalid_value、`role: "member"` → 受理、`email: ""` → required、`email: "not-mail"` → invalid_format。
   - Green = `lib/schemas/invites.ts` を実装。
3. **Route Handler は SQLite テスト DB helper 整備後 (本 TDD スコープ外)。**

## 作成または更新したファイル

- `design/012_member_invite.md` (新規作成)
