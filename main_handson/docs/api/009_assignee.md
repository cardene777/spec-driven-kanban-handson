# 担当者 API リファレンス

対応仕様 = `spec/009_assignee.md` / 対応設計 = `design/009_assignee.md` / 実装 = `app/api/cards/[cardId]/assignees/**`。
1 カードに最大 10 名の担当者 (Assignee) を割り当てる。 担当者は `CardAssignee` 中間テーブル (複合主キー `(cardId, userId)`) で多対多に保持する。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` に従う。 本 API では重複登録時のみ `409 conflict` (body 例 = `{ "error": "conflict", "fields": { "userId": "already_assigned" } }`) を追加で使う。

## GET /api/cards/{cardId}/assignees

指定カードの担当者一覧を割当順で返す。

- HTTP メソッド = `GET`
- パス = `/api/cards/{cardId}/assignees`
- 権限 = 対象ボードの `viewer` 以上
- 実装 file = `app/api/cards/[cardId]/assignees/route.ts`

### 入力

なし。 `cardId` は URL から特定する。 クエリパラメータは受け取らない (フィルタ / ページネーションは対象外)。

### 出力

- 成功 = `200` + body `{ "items": CardAssignee[] }`
- `CardAssignee` = `{ "cardId": "...", "userId": "...", "createdAt": "ISO8601" }`
- 並び順 = `createdAt` 昇順、 同時刻は `userId` 昇順
- 担当者 0 人のカードは `{ "items": [] }`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | 取得成功 | `{ "items": [ { "cardId": "...", "userId": "...", "createdAt": "..." } ] }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `404` | `cardId` が存在しない / 対象ボードの閲覧権限がない | `{ "error": "not_found" }` |

### 関連テスト

- `tests/schemas/assignees.test.ts` (`parseAssigneeCreate`)
- `tests/assignees/limit.test.ts` (`assertBelowLimit`)
- `tests/assignees/permission.test.ts` (`canManageAssignees`)
- `tests/assignees/route.test.ts`

---

## POST /api/cards/{cardId}/assignees

指定カードに担当者を 1 名追加する。 追加後、対象カードの `updatedAt` を更新する。

- HTTP メソッド = `POST`
- パス = `/api/cards/{cardId}/assignees`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/cards/[cardId]/assignees/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `userId` | string | 空文字不可 / トリム後 1 文字以上 / 存在するユーザー / 対象ボードに所属 (`viewer` 以上) |

`userId` 以外の body フィールドは `.strict()` により拒否する。 `cardId` / `createdAt` はサーバー側で決定する。

### 出力

- 成功 = `201` + body に作成された `CardAssignee` オブジェクト

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `201` | 追加成功 | `{ "cardId": "...", "userId": "...", "createdAt": "..." }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `viewer` ロールが呼び出した | `{ "error": "forbidden" }` |
| `404` | `cardId` が存在しない / 対象ボードの閲覧権限がない | `{ "error": "not_found" }` |
| `409` | 既に割当済みのユーザーを再度追加 | `{ "error": "conflict", "fields": { "userId": "already_assigned" } }` |
| `422` | 入力バリデーション / 状態エラー | `{ "error": "validation_error", "fields": { "userId": "..." } }` |

`422` の `fields.userId` に入る値。

| 値 | 条件 |
|---|---|
| `required` | `userId` 未指定または空文字 |
| `invalid_type` | `userId` が文字列でない |
| `assignee_not_found` | 存在しないユーザー |
| `assignee_not_in_board` | 対象ボードに所属しないユーザー |
| `assignees_limit_exceeded` | 担当者が既に 10 名 |

検証順序は「ユーザー存在 → ボード所属 → 重複 → 上限」。 既割当ユーザーの再追加は上限 (10 名) に達していても `409 already_assigned` を先に返す。

### 関連テスト

- `tests/schemas/assignees.test.ts` (`parseAssigneeCreate`)
- `tests/assignees/limit.test.ts` (`assertBelowLimit`、 境界 0 / 9 / 10)
- `tests/assignees/route.test.ts`

---

## DELETE /api/cards/{cardId}/assignees/{userId}

指定カードから担当者を物理削除する。 削除後、対象カードの `updatedAt` を更新する。

- HTTP メソッド = `DELETE`
- パス = `/api/cards/{cardId}/assignees/{userId}`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/cards/[cardId]/assignees/[userId]/route.ts`

### 入力

body なし。 `cardId` / `userId` は URL から特定する。

### 出力

- 成功 = `204` (body なし)

### ステータスコード

| ステータス | ケース |
|---|---|
| `204` | 削除成功 |
| `401` | 未ログイン |
| `403` | `viewer` ロールが呼び出した |
| `404` | `cardId` が存在しない / 対象ボードの閲覧権限がない / 指定 `userId` が担当者に含まれない |

`DELETE` 直後に同一 `userId` を `POST` すると新規追加として受け付け、 `createdAt` は新しい時刻で一覧末尾に配置される。

### 関連テスト

- `tests/assignees/route.test.ts`

---

## 共通のログ形式

全 API は `withApiHandler` (`lib/http/withApiHandler.ts`) 経由で 1 行 JSON を標準出力に記録する (`lib/log/audit.ts` の `logAudit`)。 成功は `level=info`、 `4xx` は `level=warn`、 `5xx` は `level=error`。

| event | 発生タイミング |
|---|---|
| `card.assignee.list` | 一覧取得 |
| `card.assignee.add` | 担当者追加 |
| `card.assignee.remove` | 担当者削除 |

### 警告 (spec / design と実装の食い違い)

- **event 名の表記が食い違う**。 `spec/009_assignee.md § 運用` は `card_assignee_add` / `card_assignee_remove` のアンダースコア区切りで記載するが、 実装 (および `design/009_assignee.md § 監査ログ`) はドット区切り (`card.assignee.add` / `card.assignee.remove`) で出力する。 本 API リファレンスは実装に合わせてドット区切りで記載する。 ログを grep / 集約する際はドット区切りを対象にする。

### 不足項目 (spec / design が要求するが実装が記録しないもの)

- **操作ユーザー識別子 (`actorId`) が常に `null`**。 `spec/009_assignee.md § 運用` と `design/009_assignee.md § 監査ログ` は担当者操作ログに操作ユーザー識別子を含めることを要求するが、 3 route いずれも `withApiHandler` の `actorId` オプションを渡していないため、 出力される `actorId` は常に `null`。 owner による他ユーザーの割当変更を `actorId` で追跡することは現状できない。
- **`boardId` が記録されない**。 spec / design は担当者ログに対象ボード識別子 (`boardId`) を含めることを要求するが、 3 route の `context` は `cardId` (および `DELETE` の `userId`) のみで `boardId` を含まない。 `boardId` でのログ絞り込みは現状できない。
- **`add` 操作の `context` に `userId` が含まれない**。 design は `card.assignee.add` の `context` に担当対象 `userId` を要求するが、 実装の `POST` route は `context={ cardId }` のみを記録する (`remove` は `context={ cardId, userId }` を記録する)。 design が挙げる `count` (一覧) も記録しない。
