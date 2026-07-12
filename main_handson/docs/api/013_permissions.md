# 権限管理 API リファレンス

対応仕様 = `spec/013_permissions.md` / 対応設計 = `design/013_permissions.md` / 実装 = `app/api/boards/[boardId]/members/**`。
本 API はボード単位の 3 ロール (`owner` / `member` / `viewer`) の一覧 / 変更 / 削除を扱う。 「最後の owner を降格 / 削除できない」 制約は `lib/permissions/lastOwner.ts` の pure 関数で判定し、 Route Handler は同一トランザクション内で `owner` 総数を集計して呼び出す。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` の 4 種 (`401` / `403` / `404` / `422`) を用いる。 本 API で追加のステータスコードは無い。

## GET /api/boards/{boardId}/members

対象ボードのメンバー一覧を返す。 一覧は `owner` → `member` → `viewer` の順、 同ロール内は `createdAt` 昇順、 同時刻は `userId` 昇順で並ぶ。

- HTTP メソッド = `GET`
- パス = `/api/boards/{boardId}/members`
- 権限 = 対象ボードの `viewer` 以上
- 実装 file = `app/api/boards/[boardId]/members/route.ts`

### 入力

なし (パスパラメータ `boardId` のみ)。

### 出力

`200` + body `{ "items": BoardMember[] }`。 各要素は `{ "userId", "name", "email", "role", "createdAt" }`。

### ステータスコード

| ステータス | ケース |
|---|---|
| `200` | 一覧取得成功 |
| `401` | 未ログイン |
| `404` | 存在しない `boardId` / メンバーでない (存在露出防止) |

### 関連テスト

- `tests/permissions/sortMembers.test.ts` (`sortMembers`)

---

## PATCH /api/boards/{boardId}/members/{userId}

対象メンバーのロールを変更する。 `owner` のみ呼び出し可能。 「最後の owner」 の降格は `422 last_owner` で拒否される (詳細 = `spec/013_permissions.md § FR-04`)。

- HTTP メソッド = `PATCH`
- パス = `/api/boards/{boardId}/members/{userId}`
- 権限 = 対象ボードの `owner`
- 実装 file = `app/api/boards/[boardId]/members/[userId]/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `role` | string | `"owner"` / `"member"` / `"viewer"` のいずれか |

### 出力

`200` + body `{ "userId", "name", "email", "role", "createdAt" }` (更新後の `BoardMember`)。

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | ロール変更成功 (同ロールへの変更は冪等) | `{ "userId": "...", "role": "member", ... }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `owner` 以外 | `{ "error": "forbidden" }` |
| `404` | 存在しない `boardId` / メンバーでない / 対象 `userId` が対象ボードの `BoardMembership` に存在しない | `{ "error": "not_found" }` |
| `422` | 最後の owner を降格 / `role` 値不正 | `{ "error": "validation_error", "fields": { "role": "last_owner" \| "invalid_value" \| "required" \| "invalid_type" } }` |

### 関連テスト

- `tests/schemas/members.test.ts` (`parseRoleUpdate`)
- `tests/permissions/lastOwner.test.ts` (`isLastOwnerProtected`)

---

## DELETE /api/boards/{boardId}/members/{userId}

メンバーを物理削除する。 呼び出し元が `owner` の場合は他人を削除可、 それ以外は自身のみ削除可 (脱退)。 「最後の owner」 の削除は `422 last_owner` で拒否される。

- HTTP メソッド = `DELETE`
- パス = `/api/boards/{boardId}/members/{userId}`
- 権限 = 対象ボードの `owner` または本人 (自分自身のみ)
- 実装 file = `app/api/boards/[boardId]/members/[userId]/route.ts`

### 入力

body なし。

### 出力

`204` (body なし)。

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `204` | 削除成功 (`owner` の他人削除、本人の脱退の両方) | (body なし) |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `owner` でも本人でもない (他人削除は `owner` 必須) | `{ "error": "forbidden" }` |
| `404` | 存在しない `boardId` / 対象 `userId` が対象ボードにメンバーとして存在しない | `{ "error": "not_found" }` |
| `422` | 最後の owner の削除 | `{ "error": "validation_error", "fields": { "userId": "last_owner" } }` |

### 関連テスト

- `tests/permissions/lastOwner.test.ts` (`isLastOwnerProtected`)

---

## 共通のログ形式

`design/013_permissions.md § 監査ログ` に従う。 全 API は `event=member.{name}` を 1 行 JSON で標準出力に記録する。 ロール変更ログには `oldRole` / `newRole` を、 削除ログには `oldRole` / `selfRemoval` を含める。 最後 owner 保護発火 (`422 last_owner`) は `warn` レベルで記録する。
