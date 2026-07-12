# メンバー招待 API リファレンス

対応仕様 = `spec/012_member_invite.md` / 対応設計 = `design/012_member_invite.md` / 実装 = `app/api/boards/[boardId]/invites/**` / `app/api/invites/[token]/**`。
招待 URL の平文 `token` は招待作成 / 再送のレスポンスで 1 度のみ返す。 DB には SHA-256 でハッシュ化した `tokenHash` のみを保存する (`spec/012_member_invite.md § 非機能要件 § セキュリティ`)。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` に従う。 本 API では `409 conflict` (承認ユーザーが既にメンバー) と `410 gone` (期限切れ / 使用済み / 失効済み) を追加で使う。

## GET /api/boards/{boardId}/invites

対象ボードの `pending` 招待一覧を返す。 `owner` のみ呼び出し可能。 レスポンスに `tokenHash` は含まれない。

- HTTP メソッド = `GET`
- パス = `/api/boards/{boardId}/invites`
- 権限 = 対象ボードの `owner`
- 実装 file = `app/api/boards/[boardId]/invites/route.ts`

### 入力

なし (パスパラメータ `boardId` のみ)。

### 出力

`200` + body `{ "items": Invite[] }`。 各要素は `{ id, boardId, email, role, status, expiresAt, invitedBy, createdAt, updatedAt }`。

### ステータスコード

| ステータス | ケース |
|---|---|
| `200` | 一覧取得成功 |
| `401` | 未ログイン |
| `403` | `owner` 以外 |
| `404` | 存在しない `boardId` / メンバーでない |

---

## POST /api/boards/{boardId}/invites

新規招待を作成し、招待 URL を返す。 `owner` のみ呼び出し可能。

- HTTP メソッド = `POST`
- パス = `/api/boards/{boardId}/invites`
- 権限 = 対象ボードの `owner`
- 実装 file = `app/api/boards/[boardId]/invites/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `email` | string | 空文字不可 / メール形式 / 保存時に小文字化 |
| `role` | string | `"member"` または `"viewer"`。 `"owner"` を含む他値は `invalid_value` |

### 出力

`201` + body `{ "invite": {...}, "token": "<平文 token>", "url": "<APP_BASE_URL>/invites/<token>" }` + `Cache-Control: no-store`。

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `201` | 招待作成成功 (`token` / `url` を 1 度だけ返す) | `{ "invite": {...}, "token": "abc...", "url": ".../invites/abc..." }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `owner` 以外 | `{ "error": "forbidden" }` |
| `404` | 存在しない `boardId` / メンバーでない | `{ "error": "not_found" }` |
| `422` | 入力バリデーション失敗 / 既メンバー / pending 重複 | `{ "error": "validation_error", "fields": { "email": "already_member" } }` |

`fields` に現れる値。

- `email`: `required` / `invalid_type` / `invalid_format` / `already_member` / `pending_exists`
- `role`: `required` / `invalid_type` / `invalid_value`

### 関連テスト

- `tests/schemas/invites.test.ts` (`parseInviteCreate`)
- `tests/invites/token.test.ts` (`generateInviteToken` / `hashInviteToken`)

---

## POST /api/boards/{boardId}/invites/{inviteId}/resend

既存 `pending` 招待の `token` を再発行し、 `expiresAt` を現在時刻 + 7 日に更新する。 旧 `token` は無効化される。

- HTTP メソッド = `POST`
- パス = `/api/boards/{boardId}/invites/{inviteId}/resend`
- 権限 = 対象ボードの `owner`
- 実装 file = `app/api/boards/[boardId]/invites/[inviteId]/resend/route.ts`

### 入力

body なし。

### 出力

`200` + body `{ "invite": {...}, "token": "<新平文 token>", "url": "..." }` + `Cache-Control: no-store`。

### ステータスコード

| ステータス | ケース |
|---|---|
| `200` | 再送成功 (新 `token` / `url` を 1 度だけ返す) |
| `401` | 未ログイン |
| `403` | `owner` 以外 |
| `404` | 存在しない `boardId` / `inviteId` |
| `422` | `status !== "pending"` (`{ "fields": { "status": "not_pending" } }`) |

---

## POST /api/boards/{boardId}/invites/{inviteId}/revoke

`pending` 招待を `revoked` 状態に遷移させる。 承認 API は以降 `410 revoked` を返す。

- HTTP メソッド = `POST`
- パス = `/api/boards/{boardId}/invites/{inviteId}/revoke`
- 権限 = 対象ボードの `owner`
- 実装 file = `app/api/boards/[boardId]/invites/[inviteId]/revoke/route.ts`

### 入力

body なし。

### 出力

`200` + body `{ "invite": { "id": "...", "status": "revoked" } }`。

### ステータスコード

| ステータス | ケース |
|---|---|
| `200` | 失効成功 |
| `401` | 未ログイン |
| `403` | `owner` 以外 |
| `404` | 存在しない `boardId` / `inviteId` |
| `422` | `status !== "pending"` (`{ "fields": { "status": "not_pending" } }`) |

---

## GET /api/invites/{token}

招待の内容を認証不要で閲覧する。 `email` / `tokenHash` / `invitedBy` はレスポンスに含めない。

- HTTP メソッド = `GET`
- パス = `/api/invites/{token}`
- 権限 = 認証不要
- 実装 file = `app/api/invites/[token]/route.ts`

### 入力

なし (パスパラメータ `token` のみ)。

### 出力

`200` + body `{ "boardId", "boardTitle", "role", "status", "expiresAt", "expired" }` + `Cache-Control: no-store`。

### ステータスコード

| ステータス | ケース |
|---|---|
| `200` | 招待存在。 `expired: true` の場合は承認 API で `410 expired` |
| `404` | 存在しない `token` |

---

## POST /api/invites/{token}/accept

ログイン中ユーザーが招待を承認し、対象ボードの `BoardMembership` を追加する。 承認後、招待は `accepted` 状態に遷移する。

- HTTP メソッド = `POST`
- パス = `/api/invites/{token}/accept`
- 権限 = ログイン済み
- 実装 file = `app/api/invites/[token]/accept/route.ts`

### 入力

body なし。 Cookie でログインユーザーを判定する。

### 出力

`200` + body `{ "boardId", "role" }` + `Cache-Control: no-store`。

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | 承認成功 (`BoardMembership` 追加、招待 `status=accepted` へ遷移) | `{ "boardId": "...", "role": "member" }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `404` | 存在しない `token` | `{ "error": "not_found" }` |
| `409` | ログインユーザーが既に対象ボードのメンバー (`BoardMembership` は追加せず招待も消費しない) | `{ "error": "conflict", "fields": { "userId": "already_member" } }` |
| `410` | 招待が期限切れ / 失効済 / 使用済 | `{ "error": "gone", "reason": "expired" \| "revoked" \| "already_used" }` |

---

## 共通のログ形式

`design/012_member_invite.md § 監査ログ` に従う。 全 API は `event=invite.{name}` を 1 行 JSON で標準出力に記録する。 平文 `token` / `tokenHash` はログに残さない。 承認ログには `actorId` (承認ユーザー) と `context.invitedBy` (作成者) を分けて記録する。
