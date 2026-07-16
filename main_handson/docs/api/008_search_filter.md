# 検索・絞り込み API リファレンス

対応仕様 = `spec/008_search_filter.md` / 対応設計 = `design/008_search_filter.md` / 実装 = `app/api/boards/[boardId]/cards/search/route.ts`。
ボード配下のカードを、 キーワード検索 (`title` / `description` / コメント本文) と絞り込み (ラベル / 期限 / 担当者 / ステータス) の組み合わせで取得する。 全条件は AND で合成する。 検索条件 → Prisma `where` の変換は pure 関数 `buildCardWhere` (`lib/search/cardWhere.ts`)。

エラー body 形式は `spec/000_shared_rules.md § HTTP ステータスコード` に従う。 本 API は `401` / `404` / `422` を使う (`viewer` 以上で共通のため `403` は設計上発生しない)。

## GET /api/boards/{boardId}/cards/search

対象ボード配下のカードを検索 / 絞り込み条件付きで取得する。 並び順は `updatedAt` 降順、 同時刻は `id` 昇順 (ページネーションなし、 全件返却)。

- HTTP メソッド = `GET`
- パス = `/api/boards/{boardId}/cards/search`
- 権限 = 対象ボードの `viewer` 以上
- 実装 file = `app/api/boards/[boardId]/cards/search/route.ts`

### 入力 (クエリパラメータ)

| パラメータ | 型 | 意味 |
|---|---|---|
| `q` | string (0-100 文字) | 検索キーワード。 空白 (半角 / タブ / 改行 / 全角) 区切りで複数キーワードを AND 合成。 空文字は無指定 |
| `labelIds` | string (カンマ区切り) | 指定ラベルの OR 合成 (少なくとも 1 つ付与) |
| `labelsNone` | `"true"` | ラベル未付与のみ (`labelIds` と排他) |
| `dueDateNone` | `"true"` | 期限未設定のみ |
| `dueDateOverdue` | `"true"` | 期限切れ (`dueDate < today`) のみ |
| `dueDateToday` | `"true"` | 今日が期限のみ |
| `dueDateWithin7Days` | `"true"` | 本日を含む 7 日以内 (`today <= dueDate <= today + 6 日`) のみ |
| `dueDateFrom` / `dueDateTo` | string (`YYYY-MM-DD`) | 期間指定 (両端を含む、 片方または両方) |
| `assigneeMe` | `"true"` | 現在ユーザーが担当のカードのみ |
| `assigneeIds` | string (カンマ区切り) | 指定担当者 ID の OR 合成 |
| `assigneeNone` | `"true"` | 担当者未割当のみ |
| `status` | `active` / `archived` / `deleted` | アーカイブ状態 (既定 `active`) |

- 真偽値パラメータは文字列 `"true"` のみを真として扱う (それ以外は `false`)。
- カンマ区切り配列は trim + 空要素除去 + 重複除去。 同一 ID の重複指定は除去して OR 合成する。
- 期限オプション (`dueDateNone` / `dueDateOverdue` / `dueDateToday` / `dueDateWithin7Days` / `dueDateFrom` or `dueDateTo` のセット) は相互排他。 担当者オプション (`assigneeMe` / `assigneeIds` / `assigneeNone`) も相互排他。

### 出力

- 成功 = `200` + body `{ "items": CardWithList[] }`
- `CardWithList` = `Card` に `list = { id, title }` と `labels: Label[]` を加えた構造。 `dueDate` は `YYYY-MM-DD` 文字列 (未設定は `null`)
- 結果 0 件は `{ "items": [] }`

### ステータスコード

| ステータス | ケース | body 例 |
|---|---|---|
| `200` | 取得成功 | `{ "items": [ { "id": "...", "list": { "id": "...", "title": "..." }, "labels": [], "dueDate": null, ... } ] }` |
| `401` | 未ログイン | `{ "error": "unauthorized" }` |
| `404` | `boardId` が存在しない / 閲覧権限がない | `{ "error": "not_found" }` |
| `422` | クエリバリデーション失敗 | `{ "error": "validation_error", "fields": { "q": "too_long" } }` |

`422` の `fields` に入る値。

| フィールド | 値 | 条件 |
|---|---|---|
| `q` | `too_long` | `q` が 100 文字超過 |
| `labelIds` | `invalid_labels_options` | `labelIds` と `labelsNone` の同時指定 |
| `labelIds` | `invalid_labels` | 別ボード所属 / 存在しないラベル ID を含む |
| `dueDate` | `invalid_due_date_options` | 期限オプションを 2 種類以上同時指定 |
| `dueDateFrom` | `invalid_range` | `dueDateFrom > dueDateTo` |
| `dueDateFrom` / `dueDateTo` | `invalid_format` / `invalid_date` | 形式不正 / 実在しない日付 |
| `assignee` | `invalid_assignee_options` | 担当者オプションを 2 種類以上同時指定 |
| `assigneeIds` | `empty_assignees` | `assigneeIds` を明示的に空で指定 (未指定は許容) |
| `status` | `invalid_status` | `active` / `archived` / `deleted` 以外 |

`labelIds` の別ボード所属と存在しない ID は区別せず両方 `invalid_labels` に集約する (存在有無を漏らさない)。 `assigneeIds` に存在しないユーザー ID を含めてもエラーにせず、 結果 0 件として扱う。

### 関連テスト

- `tests/schemas/cardSearch.test.ts` (`parseCardSearchQuery`、 排他条件 / 形式検証)
- `tests/search/cardWhere.test.ts` (`buildCardWhere`、 各絞り込み条件の合成)
- `tests/search/params.test.ts` (`parseBooleanQuery` / `splitCsv` / `splitKeywords`)

---

## 実装上の注意 (spec / design と実装の食い違い)

### 警告

- **キーワードの大文字小文字非依存は `mode: "insensitive"` ではなく `LIKE` 依存**。 `design/008_search_filter.md § Prisma クエリ組立て` は各キーワードを `contains` + `mode: "insensitive"` で合成すると定めるが、 `mode: "insensitive"` は Prisma の SQLite provider では非対応 (PostgreSQL 専用) のため、 実装 (`lib/search/cardWhere.ts`) は `mode` を付けず素の `contains` (SQL の `LIKE '%...%'`) を発行する。 SQLite の `LIKE` は ASCII について既定で大小非依存だが、 非 ASCII (日本語) の大小 / 全半角の同一視は保証されない (`spec/008_search_filter.md § 未決事項`)。
- **担当者絞り込みは単一 `assigneeId` ではなく `CardAssignee` 中間テーブル経由**。 `spec/008_search_filter.md § 既存仕様との関係` と `design/008_search_filter.md § Prisma クエリ組立て` は担当者を単一 `Card.assigneeId` 前提 (`assigneeMe` = `assigneeId: userId`、 `assigneeNone` = `assigneeId: null`) で記述するが、 担当者機能は `spec/009_assignee.md` で複数担当者 (最大 10 名) の `CardAssignee` 多対多モデルに刷新済み。 実装は `assignees: { some: { userId } }` / `assignees: { none: {} }` で合成する。 絞り込みの結果セマンティクスは同等 (「現在ユーザーが担当」 / 「指定担当者のいずれか」 / 「担当者なし」)。

### 不足項目

- **`status = archived` / `deleted` は常に結果 0 件を返す**。 本コードベースにはアーカイブ機能 (`spec/004`) が未実装で `Card.status` 列が存在しないため、 `buildCardWhere` は `status !== "active"` のとき `id: { in: [] }` (該当 0 件) の条件を積む (`lib/search/cardWhere.ts`)。 バリデーション上 `status=archived` / `status=deleted` は受理される (`422` にならない) が、 返るのは常に空一覧。 受入条件「`status = archived` を指定するとアーカイブ済みカードが返る」 「`status = deleted` を指定すると削除済みカードが返る」 は、 status 列 / アーカイブ機能が実装されるまで満たせない。
- **成功時のログは記録しない (仕様どおり)**。 検索 API は閲覧操作扱いのため、 成功時 (`200`) はログを記録しない (`spec/008_search_filter.md § 運用`)。 `4xx` / `5xx` のみ `withApiHandler` 経由で `event=card.search` として記録される。 なお `design/008_search_filter.md § 監査ログ` が要求する `qLength` / `errorFields` は `context` に含まれず (実装の `context` は `boardId` のみ)、 エラー時の操作ユーザー識別子 (`actorId`) も常に `null`。
