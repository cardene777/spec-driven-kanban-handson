# 期限 API リファレンス

対応仕様 = `spec/007_due_date.md` / 対応設計 = `design/007_due_date.md` / 実装 = `app/api/cards/[cardId]/due-date/route.ts`。
カードの期限 (Due Date) を設定 / 変更 / 解除する。 時刻は扱わず、 日付単位 (`YYYY-MM-DD`) で管理する。 内部は `Card.dueDate` を `DateTime?` (時刻 `00:00:00.000Z` 固定) で保存し、 API 層で `YYYY-MM-DD` 文字列 ↔ `DateTime` を変換する (`lib/dueDate/serialize.ts`)。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` に従う。 本 API は `401` / `403` / `404` / `422` の 4 種を使う。

## PATCH /api/cards/{cardId}/due-date

カードの期限を設定 / 変更 (上書き) / 解除する。 更新後、対象カードの `updatedAt` を更新する。

- HTTP メソッド = `PATCH`
- パス = `/api/cards/{cardId}/due-date`
- 権限 = 対象ボードの `member` 以上
- 実装 file = `app/api/cards/[cardId]/due-date/route.ts`

### 入力 (JSON body)

| フィールド | 型 | 制約 |
|---|---|---|
| `dueDate` | string (`YYYY-MM-DD`) / null | 文字列は半角ゼロパディングの `YYYY-MM-DD` かつ実在日付 (設定 / 変更)、 `null` は解除 |

`dueDate` 以外の body フィールドは `.strict()` により拒否する。 過去日付も受け付ける (過去の期限切れとして扱う)。 上限 / 下限の制約は設けない。

### 出力

- 成功 = `200` + body に更新後の `Card` オブジェクト。 `dueDate` は `YYYY-MM-DD` 文字列 (解除時は `null`) でシリアライズして返す

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | 設定 / 変更 / 解除成功 | `{ "id": "...", "listId": "...", "dueDate": "2026-07-20", ... }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `403` | `viewer` ロールが呼び出した | `{ "error": "forbidden" }` |
| `404` | `cardId` が存在しない / 対象ボードの閲覧権限がない | `{ "error": "not_found" }` |
| `422` | 入力バリデーション失敗 | `{ "error": "validation_error", "fields": { "dueDate": "invalid_format" } }` |

`422` の `fields` に入る値。

| フィールド | 値 | 条件 |
|---|---|---|
| `dueDate` | `invalid_format` | `YYYY-MM-DD` 形式でない (スラッシュ / 時刻付き / 空文字 等) |
| `dueDate` | `invalid_date` | 形式は合うが実在しない日付 (`2026-02-30` / `2026-13-01` 等) |
| `dueDate` | `invalid_type` | 文字列でも `null` でもない |
| `_` | `required` | body 全体が空 (`dueDate` フィールド未指定) |

### 期限切れ判定

判定は API レスポンスに含めず、 UI 側の pure 関数 `computeDueDateStatus(dueDate, today)` (`lib/dueDate/status.ts`) で行う。 `today` はサーバー UTC 日付 (`getServerTodayUtc()`)。 4 状態 = `none` (未設定) / `future` (期限内) / `today` (今日が期限) / `overdue` (期限切れ)。 `YYYY-MM-DD` の辞書順比較で判定する。

### 関連テスト

- `tests/schemas/dueDate.test.ts` (`parseDueDateUpdate`、 形式 / 実在日付 / 型検証)
- `tests/dueDate/validate.test.ts` (`isDateFormat` / `isRealDate`)
- `tests/dueDate/status.test.ts` (`computeDueDateStatus` の 4 状態)
- `tests/dueDate/serialize.test.ts` (`toDateOnly` / `fromDateOnly` / `addDaysUtc`)

---

## 共通のログ形式

本 API は `withApiHandler` 経由で 1 行 JSON を標準出力に記録する。 成功は `level=info`、 `4xx` は `level=warn`、 `5xx` は `level=error`。

| event | 発生タイミング |
|---|---|
| `card.due-date.update` | 期限の設定 / 変更 / 解除 |

### 警告 (spec / design と実装の食い違い)

- **event 名の表記が食い違う**。 `spec/007_due_date.md § 運用` は `card_due_date_update` のアンダースコア区切りで記載するが、 実装 (および `design/007_due_date.md § 監査ログ`) はドット区切り (`card.due-date.update`) で出力する。 本 API リファレンスは実装に合わせてドット区切りで記載する。
- **`status = archived` / `deleted` の状態エラー (`422 invalid_state`) は実装に存在しない**。 `spec/007_due_date.md § アーカイブ済み / 削除済みカードの扱い` と `design/007_due_date.md § API 設計` は `card.status !== "active"` のカードへの期限更新を `422` (`invalid_state`) で拒否すると定めるが、 本コードベースにはアーカイブ機能 (`spec/004`) が未実装で `Card.status` 列が存在しない (実装 route の冒頭コメント参照)。 そのため状態エラー分岐は設けておらず、 `invalid_state` は返らない。 受入条件「`status = archived` / `deleted` のカードに `422 invalid_state`」 は現状の実装では検証不能。

### 不足項目 (spec / design が要求するが実装が記録しないもの)

- **操作ユーザー識別子 (`actorId`) が常に `null`**。 spec / design は期限操作ログに操作ユーザー識別子を含めることを要求するが、 route が `withApiHandler` の `actorId` オプションを渡していないため、 出力される `actorId` は常に `null`。
- **`boardId` / 遷移前後の `dueDate` が記録されない**。 `spec/007_due_date.md § 運用` は対象ボード識別子 (`boardId`)、 遷移前 `dueDate`、 遷移後 `dueDate` を含めることを要求し、 `design/007_due_date.md § 監査ログ` も `context={ boardId, oldDueDate, newDueDate }` を要求するが、 実装の `context` は `cardId` のみで `boardId` / `oldDueDate` / `newDueDate` を含まない。 期限誤設定を遷移前後の値で追跡することは現状できない。
