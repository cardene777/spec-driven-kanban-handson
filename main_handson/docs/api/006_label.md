# ラベル API リファレンス

対応仕様 = `spec/006_label.md` / 対応設計 = `design/006_label.md` / 実装 = `app/api/boards/[boardId]/labels/**` / `app/api/labels/[labelId]/**` / `app/api/cards/[cardId]/labels/**`。
ラベル (Label) はボード単位で管理し、 カードに 0 個以上付与できる分類タグ。 `color` は事前定義された 8 色 (`red` / `orange` / `yellow` / `green` / `blue` / `purple` / `pink` / `gray`) のいずれか。 カードとの付与関連は `CardLabel` 中間テーブル (複合主キー `(cardId, labelId)`) で保持する。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` に従う。 本 API は `401` / `403` / `404` / `422` の 4 種を使う。

## GET /api/boards/{boardId}/labels

指定ボードのラベル一覧を `name` 昇順で返す。

- HTTP メソッド = `GET`
- パス = `/api/boards/{boardId}/labels`
- 権限 = 対象ボードの `viewer` 以上
- 実装 file = `app/api/boards/[boardId]/labels/route.ts`

### 入力

なし。 `boardId` は URL から特定する。

### 出力

- 成功 = `200` + body `{ "items": Label[] }`
- `Label` = `{ "id", "boardId", "name", "color", "createdAt", "updatedAt" }`
- 並び順 = `name` 昇順、 同名は `createdAt` 昇順
- ラベル 0 件は `{ "items": [] }`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | 取得成功 | `{ "items": [ { "id": "...", "boardId": "...", "name": "urgent", "color": "red", ... } ] }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `404` | `boardId` が存在しない / 閲覧権限がない | `{ "error": "not_found" }` |

### 関連テスト

- `tests/schemas/labels.test.ts` (`parseLabelCreate` / `parseLabelUpdate`)
- `tests/labels/colors.test.ts` (`isLabelColor` / 8 色の列挙)

---

## POST /api/boards/{boardId}/labels

指定ボードにラベルを新規作成する。 同一ボード内で `name` の重複を許容しない。

- HTTP メソッド = `POST`
- パス = `/api/boards/{boardId}/labels`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/boards/[boardId]/labels/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `name` | string | トリム後 1-50 文字 |
| `color` | string | 8 色のいずれか (小文字固定) |

### 出力

- 成功 = `201` + body に作成された `Label` オブジェクト

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `201` | 作成成功 | `{ "id": "...", "boardId": "...", "name": "urgent", "color": "red", ... }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `viewer` ロールが呼び出した | `{ "error": "forbidden" }` |
| `404` | `boardId` が存在しない / 閲覧権限がない | `{ "error": "not_found" }` |
| `422` | 入力バリデーション失敗 | `{ "error": "validation_error", "fields": { "name": "duplicate_name" } }` |

`422` の `fields` に入る値 = `name` に `required` / `too_long` / `invalid_type` / `duplicate_name`、 `color` に `required` / `invalid_color` / `invalid_type`。 `name` の一意性判定は大文字小文字を区別する (SQLite の `TEXT` 既定挙動)。

---

## PATCH /api/labels/{labelId}

ラベルの `name` または `color` を更新する。 更新後、対象ラベルが付与された全カードで表示が反映される。

- HTTP メソッド = `PATCH`
- パス = `/api/labels/{labelId}`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/labels/[labelId]/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `name` | string (任意) | 指定時はトリム後 1-50 文字 |
| `color` | string (任意) | 指定時は 8 色のいずれか |

`name` と `color` の片方または両方を指定する。 両方未指定は `422` (`_`, `no_updates`)。

### 出力

- 成功 = `200` + body に更新後の `Label` オブジェクト

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | 更新成功 | `{ "id": "...", "name": "...", "color": "...", ... }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `viewer` ロールが呼び出した | `{ "error": "forbidden" }` |
| `404` | `labelId` が存在しない / 閲覧権限がない | `{ "error": "not_found" }` |
| `422` | 入力バリデーション失敗 / `no_updates` / `duplicate_name` | `{ "error": "validation_error", "fields": { "name": "duplicate_name" } }` |

---

## DELETE /api/labels/{labelId}

ラベルを削除する。 付与関連 (`CardLabel`) は `onDelete: Cascade` で自動的に解除される。 カード自体は削除しない。

- HTTP メソッド = `DELETE`
- パス = `/api/labels/{labelId}`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/labels/[labelId]/route.ts`

### 入力

body なし。

### 出力

- 成功 = `204` (body なし)

### ステータスコード

| ステータス | ケース |
|---|---|
| `204` | 削除成功 (付与関連もカスケード解除) |
| `401` | 未ログイン |
| `403` | `viewer` ロールが呼び出した |
| `404` | `labelId` が存在しない / 閲覧権限がない |

---

## GET /api/cards/{cardId}/labels

指定カードに付与されているラベル一覧を `name` 昇順で返す。

- HTTP メソッド = `GET`
- パス = `/api/cards/{cardId}/labels`
- 権限 = 対象ボードの `viewer` 以上
- 実装 file = `app/api/cards/[cardId]/labels/route.ts`

### 入力

なし。

### 出力

- 成功 = `200` + body `{ "items": Label[] }` (中間テーブルの生表現は返さない)
- ラベル 0 件は `{ "items": [] }`

### ステータスコード

| ステータス | ケース |
|---|---|
| `200` | 取得成功 |
| `401` | 未ログイン |
| `404` | `cardId` が存在しない / 閲覧権限がない |

---

## POST /api/cards/{cardId}/labels/{labelId}

指定ラベルをカードに付与する (idempotent)。 付与後、対象カードの `updatedAt` を更新する。

- HTTP メソッド = `POST`
- パス = `/api/cards/{cardId}/labels/{labelId}`
- 権限 = 対象ボードの `member` 以上、 かつ label と card が同一ボード
- 実装 file = `app/api/cards/[cardId]/labels/[labelId]/route.ts`

### 入力

body なし。

### 出力

- 成功 = `204` (body なし)。 既に付与済みでも `204` を返し、 重複追加されない (`upsert`)

### ステータスコード

| ステータス | ケース |
|---|---|
| `204` | 付与成功 (再付与も成功、 状態は変わらない) |
| `401` | 未ログイン |
| `403` | `viewer` ロールが呼び出した |
| `404` | `cardId` / `labelId` が存在しない / 閲覧権限がない / label と card が別ボード |

別ボードのラベルは「アクセスできないリソース」 として `404` を返す (`spec/006_label.md § 異常系`)。

---

## DELETE /api/cards/{cardId}/labels/{labelId}

指定ラベルをカードから解除する (idempotent)。 解除後、対象カードの `updatedAt` を更新する。

- HTTP メソッド = `DELETE`
- パス = `/api/cards/{cardId}/labels/{labelId}`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/cards/[cardId]/labels/[labelId]/route.ts`

### 入力

body なし。

### 出力

- 成功 = `204` (body なし)。 未付与でも `204` を返す (`deleteMany` の 0 件削除)

### ステータスコード

| ステータス | ケース |
|---|---|
| `204` | 解除成功 (未付与解除も成功、 状態は変わらない) |
| `401` | 未ログイン |
| `403` | `viewer` ロールが呼び出した |
| `404` | `cardId` / `labelId` が存在しない / 閲覧権限がない / label と card が別ボード |

---

## 共通のログ形式

全 API は `withApiHandler` 経由で 1 行 JSON を標準出力に記録する。 成功は `level=info`、 `4xx` は `level=warn`、 `5xx` は `level=error`。

| event | 発生タイミング |
|---|---|
| `label.list` | ボード配下ラベル一覧取得 |
| `label.create` | ラベル作成 |
| `label.update` | ラベル編集 |
| `label.delete` | ラベル削除 |
| `card.label.list` | カード配下ラベル一覧取得 |
| `card.label.attach` | ラベル付与 |
| `card.label.detach` | ラベル解除 |

`label.update` / `label.delete` の `targetType` は `board`、 `targetId` は `labelId`。

### 警告 (spec / design と実装の食い違い)

- **event 名の表記が食い違う**。 `spec/006_label.md § 運用` は `label_create` / `label_update` / `label_delete` / `label_attach` / `label_detach` のアンダースコア区切りで記載するが、 実装 (および `design/006_label.md § 監査ログ`) はドット区切り (`label.create` 等、 付与 / 解除は `card.label.attach` / `card.label.detach`) で出力する。 本 API リファレンスは実装に合わせてドット区切りで記載する。

### 不足項目 (spec / design が要求するが実装が記録しないもの)

- **操作ユーザー識別子 (`actorId`) が常に `null`**。 spec / design は各操作ログに操作ユーザー識別子を含めることを要求するが、 7 route いずれも `withApiHandler` の `actorId` オプションを渡していないため、 出力される `actorId` は常に `null`。
- **`boardId` がボード配下ラベル API 以外で記録されない**。 `label.list` / `label.create` の `context` は `boardId` を含むが、 `label.update` / `label.delete` の `context` は `labelId` のみ、 `card.label.list` / `card.label.attach` / `card.label.detach` の `context` は `cardId` (および `labelId`) のみで、 いずれも `boardId` を含まない。 spec / design が要求する対象ボード識別子でのログ絞り込みは、 これらの操作では現状できない。
- **削除時のカスケード件数 (`deletedCardLabelCount`) が記録されない**。 `spec/006_label.md § 運用` と `design/006_label.md § 監査ログ` は `label.delete` にカスケード解除された `CardLabel` 件数を含めることを要求するが、 実装の `DELETE` route は `context={ labelId }` のみで件数を記録しない。 design が挙げる `name` / `color` / `changedFields` / 一覧の `count` も記録しない。
