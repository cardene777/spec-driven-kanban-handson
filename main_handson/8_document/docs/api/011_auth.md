# 認証 API リファレンス

対応仕様 = `spec/011_auth.md` / 対応設計 = `design/011_auth.md` / 実装 = `app/api/auth/**`。
本 API は Cookie ベースの Session (Cookie 名 = `sid`) を発行して認証状態を保持する。 Cookie 属性 = `HttpOnly` + `SameSite=Lax` + `Path=/`、 本番 (`NODE_ENV=production`) では `Secure` を追加する。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` に従う。 本 API では `401 invalid_credentials` (body 例 = `{ "error": "invalid_credentials" }`) と `409 conflict` を追加で使う。

## POST /api/auth/signup

新規ユーザーを登録し、成功時に自動でログイン (Session 発行) する。

- HTTP メソッド = `POST`
- パス = `/api/auth/signup`
- 権限 = 認証不要
- 実装 file = `app/api/auth/signup/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `email` | string | 空文字不可 / メール形式 (`@` を 1 個含み前後に 1 文字以上) / 保存時に小文字化 |
| `password` | string | 空文字不可 / 8-200 文字 / 英字 + 数字 + 記号 (3 種) を全て含む |
| `name` | string | 空文字不可 / トリム後 1-100 文字 |

### 出力

- 成功 = `201` + body `{ "user": { "id", "email", "name" } }` + `Set-Cookie: sid=<sessionId>; HttpOnly; SameSite=Lax; Max-Age=604800`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `201` | 登録成功 (Cookie 付与) | `{ "user": { "id": "...", "email": "...", "name": "..." } }` |
| `409` | `email` が既に登録済 (大文字小文字違いも重複扱い) | `{ "error": "conflict", "fields": { "email": "already_registered" } }` |
| `422` | 入力バリデーション失敗 | `{ "error": "validation_error", "fields": { "email": "invalid_format" } }` |

### 関連テスト

- `tests/schemas/auth.test.ts` (`parseSignup`)
- `tests/auth/passwordStrength.test.ts` (`checkPassword`)
- `tests/auth/passwordHash.test.ts` (`hashPassword` / `verifyPassword`)

---

## POST /api/auth/login

登録済みユーザーの `email` / `password` を検証し、成功時に新しい Session を発行する。

- HTTP メソッド = `POST`
- パス = `/api/auth/login`
- 権限 = 認証不要
- 実装 file = `app/api/auth/login/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `email` | string | 空文字不可 |
| `password` | string | 空文字不可 (強度検証は行わない、存在露出防止) |

### 出力

- 成功 = `200` + body `{ "user": { "id", "email", "name" } }` + `Set-Cookie: sid=<sessionId>; ...`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | ログイン成功 | `{ "user": { "id": "...", "email": "...", "name": "..." } }` |
| `401` | 認証失敗 (未登録 email / password 不一致) | `{ "error": "invalid_credentials" }` |
| `422` | 入力の型 / required 検証失敗 | `{ "error": "validation_error", "fields": { "email": "required" } }` |

未登録 `email` と `password` 不一致は両方 `401 invalid_credentials` を返す (`spec/011_auth.md § 非機能要件 § セキュリティ`)。

### 関連テスト

- `tests/schemas/auth.test.ts` (`parseLogin`)

---

## POST /api/auth/logout

現在の Session を破棄し、Cookie を失効させる。 冪等 (未ログインでも `204` を返す)。

- HTTP メソッド = `POST`
- パス = `/api/auth/logout`
- 権限 = 認証不要 (冪等)
- 実装 file = `app/api/auth/logout/route.ts`

### 入力

body なし。 Cookie のみで対象 Session を特定する。

### 出力

- 成功 = `204` (body なし) + `Set-Cookie: sid=; Max-Age=0`

### ステータスコード

| ステータス | ケース |
|---|---|
| `204` | 常に成功 (未ログインでも Cookie 失効ヘッダを付ける) |

### 関連テスト

なし (E2E は本 TDD スコープ外)。

---

## GET /api/auth/me

現在ログイン中のユーザー情報を返す。

- HTTP メソッド = `GET`
- パス = `/api/auth/me`
- 権限 = ログイン済み
- 実装 file = `app/api/auth/me/route.ts`

### 入力

なし。 Cookie の `sid` で判定する。

### 出力

- 成功 = `200` + body `{ "user": { "id", "email", "name" } }`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | ログイン中 | `{ "user": { "id": "...", ... } }` |
| `401` | 未ログイン / Cookie 無し / Cookie 期限切れ / 存在しない sessionId | `{ "error": "unauthorized" }` |

---

## POST /api/auth/refresh

現在の Session を破棄して新しい Session を発行し、Cookie を差し替える。 有効期限を発行時点 + 7 日に更新する。

- HTTP メソッド = `POST`
- パス = `/api/auth/refresh`
- 権限 = ログイン済み
- 実装 file = `app/api/auth/refresh/route.ts`

### 入力

body なし。

### 出力

- 成功 = `200` + body `{ "user": { ... } }` + 新しい `Set-Cookie: sid=<new-sessionId>`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | セッション延長成功 (旧 Cookie は無効化) | `{ "user": { ... } }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |

---

## 共通のログ形式

`design/011_auth.md § 監査ログ` に従い、 全 API は 1 行 JSON で標準出力にログを記録する。 認証失敗 (`invalid_credentials`) のログには `email` を含めず、 `actorId` は `null`、 `errorCode` は `invalid_credentials`。

| event | 発生タイミング |
|---|---|
| `auth.signup` | サインアップ成功 / 失敗 |
| `auth.login` | ログイン成功 / 失敗 |
| `auth.logout` | ログアウト (冪等) |
| `auth.me` | 現在ユーザー取得 |
| `auth.refresh` | セッション延長 |
