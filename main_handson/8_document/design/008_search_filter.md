# 検索と絞り込みの設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`
- `spec/004_card_movement_archive_restore.md`
- `spec/005_card_detail.md`
- `spec/006_label.md`
- `spec/007_due_date.md`
- `spec/008_search_filter.md`

## 前提

Prisma 全体スキーマ、 認証・認可の共通ユーティリティ (`getCurrentUser` / `assertBoardAccess`)、 エラーレスポンスヘルパ、 監査ログ形式、 バリデーション方針 (zod) は `design/001_boards.md § 共通設計方針` を参照する。 Card エンティティは `design/003_cards.md`、 担当者 / コメントは `design/005_card_detail.md`、 ラベル / CardLabel は `design/006_label.md`、 期限は `design/007_due_date.md` を参照する。 本 file は検索と絞り込み専用の Route Handler と Prisma クエリ組立て設計を記述する。

追加のデータモデル変更は行わない。 検索 / 絞り込みで参照する index は各設計 file 側で既に定義済み (`@@index([listId])` / `@@index([assigneeId])` / `@@index([dueDate])` / `@@index([status])` / `@@index([cardId])` on `CardLabel`)。

## データモデル

### 追加なし

- 本設計は新規モデル / migration を導入しない。
- 既存 index を利用する。 検索性能が問題になった場合の追加 index は `§ 非機能の実装方針` 参照。

### レスポンス型 `CardWithList`

検索結果は `Card` に `listId` と `list.title` を含めた形で返す (`spec/008_search_filter.md § 結果構造`)。

```typescript
type CardWithList = Card & {
  list: { id: string; title: string };
  labels: Label[]; // design/006_label.md に一致
};
```

- `labels` は既存カード API (`GET /api/lists/{listId}/cards`) と同様に include する (`design/006_label.md § 既存 Card API との連携`)。
- コメントヒット (`Comment.body` 部分一致) の情報 (`matchedCommentIds`) は初期実装で含めない (`spec/008_search_filter.md § 未決事項`)。

## API 設計

`spec/008_search_filter.md § API` の 1 endpoint を Route Handler で実装する。 file 配置。

- `app/api/boards/[boardId]/cards/search/route.ts` … `GET`

### `GET /api/boards/{boardId}/cards/search`

- 入力 = パスパラメータ `boardId`、 クエリパラメータ (`spec/008_search_filter.md § クエリパラメータ` を参照)。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `assertBoardAccess(userId, boardId, "viewer")`。 未存在 / 閲覧不可は `404`。
  2. クエリを zod で検証。 排他条件違反や形式不正は `422`。
  3. `labelIds` 指定時、 全 ID が対象ボードに属することを検証。 別ボードの ID を含めば `422 { labelIds: "invalid_labels" }`。
  4. 検索条件 → Prisma `where` clause を組立てる (`§ Prisma クエリ組立て`)。
  5. `prisma.card.findMany({ where, include: { list: { select: { id: true, title: true } }, cardLabels: { include: { label: true } } }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] })`。
  6. include 結果を `CardWithList` にフラット化して返す。
- 出力 = `200 { items: CardWithList[] }`。
- ステータス = `200` / `401` / `404` / `422`。
- ログ = 検索 API は閲覧扱いのため成功時はログ記録しない (`spec/008_search_filter.md § 運用 (操作ログ)`)。 4xx / 5xx のみ記録する。

### クエリパラメータの解析 (zod スキーマ)

`schemas/cardSearch.ts` に配置。

```typescript
export const cardSearchQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
  labelIds: z.string().optional().transform(splitCsv).default([]), // カンマ区切り
  labelsNone: booleanQuery.optional().default(false),
  dueDateNone: booleanQuery.optional().default(false),
  dueDateOverdue: booleanQuery.optional().default(false),
  dueDateToday: booleanQuery.optional().default(false),
  dueDateWithin7Days: booleanQuery.optional().default(false),
  dueDateFrom: dateQuery.optional(), // YYYY-MM-DD
  dueDateTo: dateQuery.optional(),
  assigneeMe: booleanQuery.optional().default(false),
  assigneeIds: z.string().optional().transform(splitCsv).default([]),
  assigneeNone: booleanQuery.optional().default(false),
  status: z.enum(["active", "archived", "deleted"]).optional().default("active"),
}).superRefine((val, ctx) => {
  // 排他条件を検証 (§ 排他条件検証)
});
```

- `booleanQuery` は文字列 `"true"` のみを真として扱う (`spec/008_search_filter.md § バリデーション` の初期方針)。 それ以外の値は false。
- `splitCsv` は `""` → `[]`、 `"a,b"` → `["a", "b"]`、 重複除去、 trim を行う。
- `dateQuery` は `design/007_due_date.md § pure 関数と zod スキーマ` の `YYYY-MM-DD` 検証ロジックを共有する。

### 排他条件検証

`.superRefine` 内で以下を検査し、 違反時 `422` を返す。

| 排他ルール | エラーコード |
|---|---|
| `labelIds.length > 0` かつ `labelsNone === true` | `invalid_labels_options` |
| 期限オプション (`dueDateNone` / `dueDateOverdue` / `dueDateToday` / `dueDateWithin7Days` / `dueDateFrom` or `dueDateTo`) のうち 2 種類以上が指定 | `invalid_due_date_options` |
| `dueDateFrom` と `dueDateTo` の両方指定時、 `dueDateFrom > dueDateTo` | `invalid_range` |
| 担当者オプション (`assigneeMe` / `assigneeIds.length > 0` / `assigneeNone`) のうち 2 種類以上が指定 | `invalid_assignee_options` |
| `assigneeIds` が空配列だが `assigneeIds` パラメータが明示的に空文字で渡された (未指定は allow、 明示 empty は `empty_assignees`) | `empty_assignees` (実装は「明示空指定」 判定を transform 前に確認する) |

### Prisma クエリ組立て

`lib/search/cardWhere.ts` に pure 関数として切り出す。

```typescript
function buildCardWhere(params: ParsedCardSearchQuery, ctx: {
  boardId: string;
  userId: string;
  today: string; // YYYY-MM-DD, サーバー UTC 日付
  labelIdsInBoard: string[]; // 事前検証済み
}): Prisma.CardWhereInput
```

各条件の合成方針。

- **ボードスコープ** = `list: { boardId: ctx.boardId }`。
- **キーワード `q`** = 空白で分割した各キーワードを AND 合成。 各キーワードは以下 3 条件を OR。
  - `title: { contains: keyword, mode: "insensitive" }`
  - `description: { contains: keyword, mode: "insensitive" }`
  - `comments: { some: { body: { contains: keyword, mode: "insensitive" } } }`
- **ラベル**。
  - `labelIds` 指定時 = `cardLabels: { some: { labelId: { in: labelIds } } }` (OR 合成)。
  - `labelsNone = true` = `cardLabels: { none: {} }`。
- **期限**。
  - `dueDateNone = true` = `dueDate: null`。
  - `dueDateOverdue = true` = `dueDate: { lt: dateAt(today) }` (時刻 `00:00:00.000Z`)。
  - `dueDateToday = true` = `dueDate: { gte: dateAt(today), lt: dateAt(today + 1 day) }`。
  - `dueDateWithin7Days = true` = `dueDate: { gte: dateAt(today), lte: dateAt(today + 6 days) }`。
  - `dueDateFrom` + `dueDateTo` (両方 or 片方) = `dueDate: { gte: dateAt(from), lte: dateAt(to) }` (未指定側は境界省略)。 `dueDate: null` は自動的に除外される (Prisma の比較演算子は null 除外)。
- **担当者**。
  - `assigneeMe = true` = `assigneeId: ctx.userId`。
  - `assigneeIds` 指定時 = `assigneeId: { in: assigneeIds }`。
  - `assigneeNone = true` = `assigneeId: null`。
- **ステータス** = `status: params.status` (既定 `active`)。

### キーワード分割とエスケープ

- `q` を `/\s+/` で split、 空要素除去。
- Prisma `contains` は SQL の `LIKE '%<value>%'` を発行するため、 ワイルドカード文字 `%` / `_` はエスケープが必要。 SQLite は `LIKE ... ESCAPE '\'` 構文をサポートするが、 Prisma の `contains` は内部で自動エスケープを行う (Prisma v5+)。 本設計は Prisma の自動エスケープに依拠する (`spec/008_search_filter.md § 未決事項` の判断)。
- `mode: "insensitive"` は SQLite では `LOWER()` ラップで実現される。 非 ASCII (日本語) の case 判定は SQLite の既定挙動に依存する (`spec/008_search_filter.md § 未決事項`)。

### 別ボード label ID の事前検証

`labelIds` の同一ボード検証は Prisma クエリ組立て前に別 SELECT で行う。

```typescript
const foundLabels = await prisma.label.findMany({
  where: { id: { in: labelIds }, boardId: ctx.boardId },
  select: { id: true },
});
if (foundLabels.length !== new Set(labelIds).size) {
  throw validationError({ labelIds: "invalid_labels" });
}
```

- 「別ボード」 と「存在しない」 を区別せず、 両方 `invalid_labels` で応答する (存在有無を漏らさない `spec/008_search_filter.md § バリデーション`)。

## UI 構造

### 配置

- ボード詳細画面 (`app/boards/[boardId]/page.tsx`) の上部に検索バー + フィルタパネル (`BoardSearchBar`) を配置する。
- 検索 / 絞り込みが適用中は、 リスト一覧 (`design/002_lists.md § UI 構造` の `BoardListsView`) の表示対象を「検索結果に含まれるカード」 に限定する。
- リスト構造 (列) は維持し、 結果に含まれないカードは非表示、 該当リストがカード 0 件になれば「フィルタ適用中の空状態」 を各リスト内に表示する。

### 主要 Client Component (追加分)

| コンポーネント | 責務 |
|---|---|
| `BoardSearchBar` | 検索バー + フィルタ導線の親コンポーネント。 検索状態 (`CardSearchState`) を保持し、 URL クエリと双方向同期する。 |
| `CardSearchKeywordInput` | キーワード入力 (100 文字上限、 デバウンス 300ms 想定、 `ui-design/`)。 |
| `CardFilterLabelsPicker` | ラベルフィルタ (multi-select + 「ラベルなし」 チェック)。 |
| `CardFilterDueDatePicker` | 期限フィルタ (排他選択: none / overdue / today / within7Days / range)。 |
| `CardFilterAssigneePicker` | 担当者フィルタ (排他選択: me / IDs / none)。 |
| `CardFilterStatusPicker` | ステータス切替 (`active` / `archived` / `deleted`)。 |
| `CardSearchClearButton` | 「フィルタをクリア」 導線。 |
| `useCardSearch` | 検索状態 hook。 URL クエリ ↔ state 同期、 `GET /api/boards/{boardId}/cards/search` 呼出、 デバウンス処理。 |

### URL 同期

- 検索 / 絞り込みの状態を URL クエリ (`?q=...&labelIds=lbl1,lbl2&dueDateOverdue=true&status=active`) に反映する。
- `next/navigation` の `useSearchParams` + `router.replace` で双方向同期。
- URL クエリを外部からブックマークして直リンクで開くと同じ検索結果が復元される。

### 状態表示

- 検索 / 絞り込みが未適用: 通常のリスト表示 (`design/002_lists.md`)。
- 検索 / 絞り込み適用中: フィルタ適用中のインジケータ + 「フィルタをクリア」 導線。
- 結果 0 件: 通常の空状態と区別した「該当するカードがありません」 相当の表示 (`ui-design/`)。

### ローディングとエラー

- 検索実行中は検索バー横にスピナー表示 (`ui-design/`)。
- API `422` = 検索バー / フィルタパネル内にフィールド別 inline error、 直前の結果は保持。
- API `404` (ボード未存在) = ボード詳細画面から `/` にリダイレクト + toast (`ui-design/`)。
- API `401` = ログイン導線表示 (`ui-design/`)。

## 状態遷移

### エンティティ状態

本設計は新規エンティティを追加しないため、 エンティティ状態遷移は既存の Card / Label / Comment に従う (それぞれ `design/003_cards.md` / `design/006_label.md` / `design/005_card_detail.md` を参照)。

### UI 状態遷移 (検索)

```
initial (URL クエリから復元) → search-idle
  → キーワード入力 → debounce (300ms) → fetching → success → result 表示
                                       ↘ error(422) → inline error, 直前結果保持
  → フィルタ選択 → 即 fetch → fetching → success → result 表示
  → クリア → search-idle (通常のリスト表示に戻る)
```

### クエリ状態遷移 (URL 同期)

- state 変更 → URL クエリ更新 (`router.replace`)。
- URL クエリ変更 (ブラウザバック / 戻る / 直リンク) → state 復元 → 再 fetch。
- 二方向同期は debounce を挟み、 タイプ中の連続 URL 更新を防ぐ。

## 非機能の実装方針

### 性能

- 検索クエリの主要 index。
  - `Card.list.boardId` 経路 = `List.boardId` は `@@index([boardId])` (`design/002_lists.md`)。
  - `Card.assigneeId` = `@@index([assigneeId])` (`design/005_card_detail.md`)。
  - `Card.dueDate` = `@@index([dueDate])` (`design/007_due_date.md`)。
  - `Card.status` = `@@index([status])` (`design/007_due_date.md` で追加)。
  - `CardLabel.labelId` = `@@index([labelId])` (`design/006_label.md`)。
  - `Comment.body` = 全文検索用 index は SQLite ネイティブの `LIKE '%...%'` では効かないため、 対象数が上限を超える場合の対応は `§ 実装方針` で判断する。 初期実装は素の `LIKE` で対応する。
- 結果件数上限は本設計で設けない。 `spec/008_search_filter.md § 非機能要件` の目安 (1 ボードあたりカード 1000、 コメント 10000) を初期上限とする。 上限超過時の警告 / ページネーションは未対応 (`spec/008_search_filter.md § 未決事項`)。
- Prisma include は 1 クエリで完結 (N+1 なし)。

### セキュリティ

- SQL インジェクション対策は Prisma のプレースホルダに委ねる (`constitution.md § セキュリティ`)。 生 SQL は使わない。
- ワイルドカード文字 (`%` / `_`) のエスケープは Prisma v5+ の `contains` 自動エスケープに依拠する。
- 別ボードの label / assignee ID を漏らさないため、 `labelIds` 検証で「別ボード」 と「存在しない」 を同じ `invalid_labels` に集約する。 `assigneeIds` は存在しない ID を含めても結果 0 件で応答し、 別ボード検証は行わない (`spec/008_search_filter.md § 境界条件` の初期方針)。
- 検索キーワードのログ記録は行わない (プライバシー配慮、 `constitution.md § セキュリティ` に留意)。 4xx / 5xx のエラーログには `q` の**長さ**のみを記録し、 本文は残さない。

### 運用

- 検索 API 呼出はログ記録しない (`spec/008_search_filter.md § 運用 (操作ログ)`)。
- 4xx / 5xx は既存の `logAudit` 経路で記録し、 `context` には「どのフィルタが失敗したか」 (`invalid_labels_options` 等のエラーコード) を残す。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/boards/{boardId}/cards/search` | `assertBoardAccess(userId, boardId, "viewer")` + `labelIds` 検証 (同一ボード内) | 未認証 `401`、 未存在 / 閲覧不可 `404`、 排他違反 / 形式違反 `422`、 別ボード label `422` |

- 検索 / 絞り込みは `viewer` 以上で共通 (`member` / `owner` に追加権限なし)。 `spec/008_search_filter.md § 権限境界` に一致。
- `status = archived` / `deleted` は既存の archived / deleted 一覧 API と同じ閲覧範囲 (`viewer` 以上、 `spec/004_card_movement_archive_restore.md § 権限境界`)。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `card.search` 成功 | 記録しない | — (閲覧扱い) |
| `card.search` 401 | `warn` | `actorId=null`、 `status=401`、 `errorCode="unauthorized"` |
| `card.search` 404 | `warn` | `actorId`、 `targetId=boardId`、 `status=404`、 `errorCode="not_found"` |
| `card.search` 422 | `warn` | `actorId`、 `context={ boardId, errorFields, qLength }` (`q` 本文は含めない)、 `status=422`、 `errorCode="validation_error"` |
| `card.search` 5xx | `error` | `actorId`、 `status=500`、 `errorCode="internal_error"`、 `context={ stack, boardId }` |

## テスト方針

### Vitest 構成 (Board / List / Card 設計と共通)

- 単体テスト … zod スキーマ (排他条件の 5 pattern)、 `buildCardWhere` pure 関数 (各絞り込み条件 × 検索キーワードの合成、 期限判定の境界)、 `splitCsv` / `booleanQuery` / `dateQuery` transform。
- Route Handler テスト … 独立 SQLite テスト DB。 `getCurrentUser` 差し替え。 検索 + 絞り込みの実 SQL 挙動を検証。
- UI テスト … `BoardSearchBar` の URL 同期、 デバウンス、 クリア動作 (優先度中)。

### ケース一覧

| 種別 | ケース例 |
|---|---|
| 正常系 (検索) | `q` 単一キーワードで title / description / comment 3 分岐にヒット、 空白区切り複数キーワード AND、 大文字小文字非依存、 `q=""` は絞り込みのみ適用 |
| 正常系 (ラベル) | `labelIds` 1 件 / 複数件 OR、 `labelsNone = true` (ラベル 0 件のみ)、 未指定は全ラベル対象 |
| 正常系 (期限) | `dueDateNone` / `dueDateOverdue` / `dueDateToday` / `dueDateWithin7Days` / `dueDateFrom` + `dueDateTo` の 5 パターン、 range 内の両端を含む |
| 正常系 (担当者) | `assigneeMe = true` / `assigneeIds` OR / `assigneeNone = true`、 未指定は全担当者対象 |
| 正常系 (ステータス) | `status = active` (既定) / `archived` / `deleted` |
| 正常系 (合成) | キーワード + ラベル + 期限 + 担当者 + status を全指定して AND 適用、 結果 1 件が全条件を満たすカードのみ |
| 正常系 (順序) | `updatedAt` 降順、 同時刻の `id` 昇順 |
| 権限 | 未ログイン `401`、 存在しない `boardId` `404`、 未参加ボード `404` |
| バリデーション (キーワード) | `q` 101 文字 = `422 too_long`、 `q` 配列渡し = `422 invalid_type` |
| バリデーション (ラベル) | `labelIds` + `labelsNone = true` 同時 = `422 invalid_labels_options`、 別ボード label ID = `422 invalid_labels` |
| バリデーション (期限) | 2 種類以上同時指定 = `422 invalid_due_date_options`、 `dueDateFrom > dueDateTo` = `422 invalid_range`、 `dueDateFrom` 形式不正 = `422 invalid_format` / `invalid_date` |
| バリデーション (担当者) | 2 種類以上同時指定 = `422 invalid_assignee_options`、 `assigneeIds` 明示空 = `422 empty_assignees` |
| バリデーション (ステータス) | `status = pending` (列挙外) = `422 invalid_status` |
| 境界 | `q = ""` (未指定と等価)、 `q = 100 文字`、 `q = 101 文字` (fail)、 `labelIds = []` (未指定と等価)、 `assigneeIds` 空 (明示 vs 未指定の挙動差) |
| 存在しない ID | `assigneeIds` に存在しない User ID → 結果 0 件 (`422` にならない)、 `labelIds` に存在しない Label ID → `422 invalid_labels` |
| 結果 0 件 | 全条件で 0 件ヒット時、 200 で `{ items: [] }` |
| 期限判定 | 「本日」 のモック (`vi.useFakeTimers` + `vi.setSystemTime`) で `dueDateOverdue` / `today` の境界検証 |
| ロール別 | `viewer` で `status = archived` / `deleted` も検索可能 (既存 archived / deleted 一覧と一致) |
| コメント検索 | コメント本文にキーワードがある場合カードがヒット、 同一カードに複数マッチしても重複しない |

### 補助ヘルパ

- `tests/helpers/factories.ts` に「検索 fixture」 を用意する (複数リスト + 複数カード + 複数ラベル + 複数担当者 + 期限バリエーション)。 1 ボードあたり 5〜10 カードの現実的な組合せを 1 関数で用意する。
- `tests/helpers/date.ts` (`design/007_due_date.md` で追加) の date helper を再利用。
- pure 関数 `buildCardWhere` は「入力 → Prisma where 出力」 の構造比較で assert。 実 DB 呼出を挟まず単体で網羅する。

## 実装方針 (本設計で固定する判断)

- 検索 / 絞り込みは `GET /api/boards/{boardId}/cards/search` の 1 endpoint で全機能を提供する。 別 endpoint (検索専用 / 絞り込み専用) には分けない。 理由 = クエリパラメータで全条件を表現可能、 URL 共有性が上がる。
- クエリパラメータは URL クエリ (query string) のみで受け付ける (`GET`)。 body 経由 (`POST`) は採用しない。 検索は冪等な閲覧操作で、 URL 共有可能な形が UX に有利なため。
- 配列パラメータはカンマ区切りで受ける (`labelIds=a,b,c`)。 反復形式 (`labelIds=a&labelIds=b`) は初期実装で未対応。 将来 SearchParams が反復を要求する場合は zod 側の `preprocess` で吸収する。
- キーワード検索は SQLite の `LIKE '%...%'` (Prisma `contains`) を採用。 全文検索エンジン (FTS5) は初期実装で未採用。 上限超過時の対応は将来別 spec で扱う (`spec/008_search_filter.md § 未決事項`)。
- キーワードは空白 (`\s+`) で分割して AND 合成する。 分割後の各キーワードは title / description / Comment.body の OR。
- 大文字小文字は Prisma `mode: "insensitive"` に委ねる。 非 ASCII 判定は SQLite 既定挙動 (`spec/008_search_filter.md § 未決事項`)。
- 排他条件検証は zod `.superRefine` に集約。 Route Handler 内では zod のエラーを `validationError()` に変換するだけの薄い実装にする。
- `assigneeIds` の存在しない User ID は「結果 0 件」 で応答 (存在有無を漏らさない)。 `labelIds` の別ボード / 存在しない ID は「情報漏洩リスクなし」 と判断し `422` で明示する (label は board scope 明示リソースのため)。
- 結果並び順は `updatedAt` 降順で固定 (`spec/008_search_filter.md § 検索結果の並び順`)。 切替オプションは未対応。
- 検索 API のログ記録は 4xx / 5xx のみ。 成功時は記録しない (プライバシー配慮)。
- ページネーション未対応 (全件返却)。 上限超過時の挙動は将来別 spec (`spec/008_search_filter.md § 未決事項`)。

## 実装順序

1. **`design/001_boards.md` / `design/002_lists.md` / `design/003_cards.md` / `design/004_card_movement_archive_restore.md` / `design/005_card_detail.md` / `design/006_label.md` / `design/007_due_date.md` の実装順序を先に完了させる**
   Board / List / Card / 状態 / 担当者 / コメント / ラベル / 期限が本設計の前提。 全前提が揃わないと検索対象のデータモデルが揃わない。
2. **共通ユーティリティと pure 関数**
   - `lib/search/booleanQuery.ts` / `splitCsv.ts` / `dateQuery.ts` (transform helpers)。
   - `lib/search/cardWhere.ts` の `buildCardWhere` pure 関数。 全絞り込み条件を Prisma `where` に変換。
   - `lib/search/labelValidation.ts` の別ボード検証 helper (Prisma 呼出を含む、 unit test は mock)。
   - `schemas/cardSearch.ts` の zod スキーマ (排他条件 `.superRefine` を含む)。
   - 全て pure 関数として単体テストする (Prisma 呼出はテスト時に mock、 または Route Handler テストで検証)。
   依存 = 手順 1。
3. **API endpoint 1 本**
   `GET /api/boards/{boardId}/cards/search` を実装する。 `assertBoardAccess` → zod 検証 → `labelIds` 別ボード検証 → `buildCardWhere` → `prisma.card.findMany` の順で薄く実装する。
   依存 = 手順 2。
4. **カード検索状態と URL 同期 hook**
   `useCardSearch` hook を実装する。 URL クエリ ↔ state 同期、 デバウンス、 API 呼出、 ローディング / エラー状態管理を集約する。
   依存 = 手順 3。
5. **UI コンポーネント**
   `BoardSearchBar` (親) → 各フィルタ picker (Label / DueDate / Assignee / Status) → `CardSearchKeywordInput` → `CardSearchClearButton` の順で組み込む。 各 picker は `useCardSearch` state に対する controlled component として実装する。
   依存 = 手順 4。
6. **ボード詳細画面への配線**
   `BoardListsView` に「検索結果に含まれるカード ID セット」 を props で渡し、 該当しないカードを非表示にする。 リスト内の 0 件表示を「フィルタ適用中の空状態」 に切替える。
   依存 = 手順 5。
7. **テスト整備**
   pure 単体テスト (手順 2、 zod 排他条件 + `buildCardWhere` の各条件) → Route Handler テスト (手順 3、 実 SQLite で全パターン網羅 + 期限モック) → UI テスト (手順 4、 5、 URL 同期 + デバウンス) の順で追加する。
   依存 = 手順 2〜6。
