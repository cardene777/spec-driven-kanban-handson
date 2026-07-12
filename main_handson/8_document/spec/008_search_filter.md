# 検索と絞り込みの仕様

## 概要

本 file はカードの検索と絞り込みの仕様を定義する。
検索は「カードタイトル、説明文、コメント本文」 に対するキーワード検索を扱う。
絞り込みは「ラベル、期限、担当者、アーカイブ状態」 の組み合わせを扱う。
検索と絞り込みは同時に適用でき、対象は特定ボード配下のカードとする。
共通ルールは `spec/000_shared_rules.md`、カード仕様は `spec/003_cards.md`、ライフサイクルは `spec/004_card_movement_archive_restore.md`、カード詳細は `spec/005_card_detail.md`、ラベルは `spec/006_label.md`、期限は `spec/007_due_date.md` を参照する。

## 既存仕様との関係

- `spec/003_cards.md § API` の `GET /api/lists/{listId}/cards` はリスト単位の全件取得のみで、検索や絞り込みは含まない。本 spec ではボード単位の検索、絞り込み API を新設し、既存 API とは独立させる。
- `spec/004_card_movement_archive_restore.md § API` の `archived-cards` / `deleted-cards` 一覧はボード単位で状態別に取得する既存経路。本 spec の絞り込み条件「アーカイブ状態」 で `active` / `archived` / `deleted` を横断的に扱う場合、既存経路との棲み分けは `§ 既存 API との棲み分け` を参照する。
- ラベル絞り込みは `spec/006_label.md § CardLabel 関連` を前提とする。
- 期限絞り込みは `spec/007_due_date.md § 期限切れ判定` を前提とする。
- 担当者絞り込みは `spec/005_card_detail.md § 対象データ` の `assigneeId` を前提とする。

### 既存 API との棲み分け

- `GET /api/boards/{boardId}/archived-cards` と `GET /api/boards/{boardId}/deleted-cards` は既存のまま維持する (アーカイブ / 削除済み一覧画面の 1 次経路)。
- 本 spec で新設する検索、絞り込み API は「ボード配下のカードを条件で横断取得する」 用途に用いる。`status` 条件を明示的に指定する。指定省略時は `active` のみ返す。

## 対象データ

本 spec は検索、絞り込みの入力パラメータと、その適用対象を規定する。追加の永続化フィールドはない。
検索対象フィールドは以下。

| フィールド | 出典 | 検索範囲 |
|---|---|---|
| `Card.title` | `spec/003_cards.md` | 全文一致 (部分一致、大文字小文字を区別しない) |
| `Card.description` | `spec/003_cards.md` | 全文一致 (部分一致、大文字小文字を区別しない) |
| `Comment.body` | `spec/005_card_detail.md` | 全文一致 (部分一致、大文字小文字を区別しない) |

- コメント本文にマッチしたカードは、マッチしたコメントを持つカードとしてヒットする。個別のコメント行を返すのではなくカード単位でヒットを返す。

## 機能要件

### 検索

- 対象ボードの `viewer` 以上のユーザーが利用できる。
- キーワード `q` を受け取り、`title` / `description` / `Comment.body` のいずれかに部分一致するカードを返す。
- 大文字小文字を区別しない (SQLite の `LIKE` は既定で ASCII 大小区別しない挙動、非 ASCII は設計工程で確認)。
- 空白区切りの複数キーワードは AND 条件 (全キーワードが上記いずれかのフィールドに部分一致するカード) とする。
- `q` が 0 文字 (未指定または空文字) の場合、検索条件は「なし」 として扱い、絞り込みのみを適用する。
- `q` は 100 文字を上限とする。上限超過は `422` (`too_long`)。

### 絞り込み

以下のフィルタを組み合わせて指定できる。全条件は AND で合成する。

#### ラベル絞り込み

- 1 つ以上のラベル ID を受け取り、対象カードに「指定ラベルの少なくとも 1 つ」 が付与されているものを返す (OR 合成)。
- 空配列は「ラベル未付与のカードのみ」 を意味するオプション (`labelsNone = true`) と別扱いにする。
- ラベル ID の全てが同一ボードに属することを検証する。別ボードのラベル ID を含む場合は `422` (`invalid_labels`)。

#### 期限絞り込み

以下のいずれかのオプションを排他的に受け取る (複数指定は `422`)。

| オプション | 意味 |
|---|---|
| `dueDateNone = true` | 期限未設定 (`dueDate = null`) のカードのみ |
| `dueDateOverdue = true` | 期限切れ (`dueDate < today`) のカードのみ |
| `dueDateToday = true` | 今日が期限 (`dueDate = today`) のカードのみ |
| `dueDateWithin7Days = true` | 本日を含む 7 日以内 (`today <= dueDate <= today + 6 日`) のカードのみ |
| `dueDateFrom` / `dueDateTo` | 期間指定 (`YYYY-MM-DD` 形式、いずれか片方または両方)。両端を含む |

- 「今日」 の判定は `spec/007_due_date.md § 期限切れ判定` を参照する (サーバー時刻 UTC 日付、初期方針)。

#### 担当者絞り込み

以下のいずれかのオプションを排他的に受け取る (複数指定は `422`)。

| オプション | 意味 |
|---|---|
| `assigneeMe = true` | 現在ユーザーが担当のカードのみ |
| `assigneeIds = [...]` | 指定担当者 ID (複数) のいずれかが担当のカード (OR 合成) |
| `assigneeNone = true` | 担当者未割当 (`assigneeId = null`) のカードのみ |

- `assigneeIds` は空配列を許容しない (0 件は `422`、または「無視」 のいずれかを設計工程で決める。初期方針は `422` (`empty_assignees`))。
- `assigneeIds` の全ユーザーが対象ボードの閲覧権限を持つことは検証しない (存在しないユーザー ID を指定した場合は結果 0 件で返す)。

#### アーカイブ状態絞り込み

- `status` を `active` / `archived` / `deleted` のいずれかで指定する (単一値、既定は `active`)。
- 複数状態を横断取得する用途は本 spec では扱わない (初期実装で 1 状態のみを対象、`§ 未決事項` 参照)。

### 検索結果の並び順

- 既定の並び順は `updatedAt` 降順、同時刻は `id` 昇順で解決する (直近更新順)。
- クライアントが並び順を切り替える指定は本 spec の対象外 (`§ 未決事項`)。

### 結果構造

- 検索結果は「ボード内のカードのフラット一覧」 として返す (リスト単位のグルーピングは含めない、UI 側でグルーピングする)。
- 各カードには通常のカードフィールドに加え、そのカードが属する `listId` および `list.title` を含める (UI 側でリスト表示が可能なように)。詳細レスポンス構造は設計工程で決める。

### 検索、絞り込みの合成

- 上記の検索キーワードと各絞り込みは全て AND 条件で合成する。
- 検索キーワードのみ / 絞り込みのみ / 両方の指定を全て許容する。
- 全条件未指定 (キーワード空、絞り込み空、`status` 既定 `active`) の場合、対象ボードの `active` カード全件を返す。

## 画面

- ボード詳細画面 (`/boards/[id]`) の上部に検索バーとフィルタ導線を配置する (詳細は `ui-design/`)。
- 検索バーは 100 文字までの入力に制限する。
- フィルタ導線はラベル / 期限 / 担当者 / アーカイブ状態を個別に開閉できる (UI 詳細は `ui-design/`)。
- 検索、絞り込みが適用されている間、「フィルタ適用中」 の状態表示と「フィルタをクリア」 の導線を表示する。
- 検索、絞り込み結果 0 件のとき、「該当するカードがありません」 相当の空状態を表示する。文言は `ui-design/`。
- 検索、絞り込み中も既存のリスト表示 (`spec/002_lists.md`) の骨格は保持する。結果に含まれないカードは非表示、リストは空状態を表示する。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `GET` | `/api/boards/{boardId}/cards/search` | 対象ボード配下のカードを検索、絞り込み条件付きで取得 | 対象ボードの `viewer` 以上 |

- レスポンス形式と認証チェック順序は `spec/000_shared_rules.md` に従う。
- レスポンスは `{ items: CardWithList[] }` (`CardWithList` は Card に `listId` と `list.title` を追加した構造、詳細は設計工程)。
- 一覧はページネーションを行わず、全件を返す (`spec/000_shared_rules.md § 一覧 API のレスポンス構造` と整合、初期実装範囲)。

### クエリパラメータ

| パラメータ | 型 | 意味 | 例 |
|---|---|---|---|
| `q` | 文字列 (0〜100 文字) | 検索キーワード。空文字は無指定として扱う | `q=バグ` |
| `labelIds` | 文字列配列 (カンマ区切り) | 指定ラベル OR 合成 | `labelIds=lbl1,lbl2` |
| `labelsNone` | 真偽値 | ラベル未付与のみ (labelIds と排他) | `labelsNone=true` |
| `dueDateNone` | 真偽値 | 期限未設定 | `dueDateNone=true` |
| `dueDateOverdue` | 真偽値 | 期限切れ | `dueDateOverdue=true` |
| `dueDateToday` | 真偽値 | 今日が期限 | `dueDateToday=true` |
| `dueDateWithin7Days` | 真偽値 | 7 日以内 | `dueDateWithin7Days=true` |
| `dueDateFrom` | 文字列 (`YYYY-MM-DD`) | 期間開始 (含む) | `dueDateFrom=2026-07-01` |
| `dueDateTo` | 文字列 (`YYYY-MM-DD`) | 期間終了 (含む) | `dueDateTo=2026-07-31` |
| `assigneeMe` | 真偽値 | 現在ユーザー担当 | `assigneeMe=true` |
| `assigneeIds` | 文字列配列 (カンマ区切り) | 指定担当者 OR 合成 | `assigneeIds=usr1,usr2` |
| `assigneeNone` | 真偽値 | 担当者未割当 | `assigneeNone=true` |
| `status` | 文字列 (`active` / `archived` / `deleted`) | アーカイブ状態 (既定 `active`) | `status=archived` |

- 各パラメータの詳細な直列化形式 (カンマ区切り vs 反復 `labelIds=x&labelIds=y`) は設計工程で決める。本 spec ではカンマ区切りを初期方針とする。

## 受入条件

- [ ] `viewer` 以上のユーザーが検索キーワードを入力して検索を実行すると、`title` / `description` / `Comment.body` のいずれかに部分一致するカードのみが表示される。
- [ ] 空白区切りの複数キーワードは AND 条件で絞り込まれる。
- [ ] `q` が 0 文字のとき、検索条件は「なし」 として扱われ、絞り込みのみが適用される。
- [ ] `q` が 101 文字以上のとき、`422` (`too_long`) が返る。
- [ ] `labelIds` に 1 つ以上のラベルを指定すると、そのラベルのいずれかが付与されているカードのみが返る。
- [ ] `labelsNone = true` を指定すると、ラベルが 1 つも付与されていないカードのみが返る。
- [ ] `labelIds` と `labelsNone` の同時指定は `422` (`invalid_labels_options`) が返る。
- [ ] 別ボードのラベル ID を `labelIds` に含めると `422` (`invalid_labels`) が返る。
- [ ] `dueDateOverdue = true` を指定すると、`dueDate` が本日より前のカードのみが返る。
- [ ] `dueDateToday = true` を指定すると、`dueDate` が本日と同一のカードのみが返る。
- [ ] `dueDateWithin7Days = true` を指定すると、本日を含む 7 日以内のカードのみが返る。
- [ ] `dueDateFrom` と `dueDateTo` を組み合わせて期間指定すると、両端を含む範囲のカードが返る。
- [ ] 期限絞り込みのオプションを 2 つ以上同時指定すると `422` (`invalid_due_date_options`) が返る。
- [ ] `assigneeMe = true` を指定すると、現在ユーザーが担当のカードのみが返る。
- [ ] `assigneeIds` に複数指定すると、いずれかが担当のカードが返る (OR)。
- [ ] `assigneeNone = true` を指定すると、担当者未割当のカードのみが返る。
- [ ] 担当者絞り込みのオプションを 2 つ以上同時指定すると `422` (`invalid_assignee_options`) が返る。
- [ ] `status = archived` を指定すると、対象ボードのアーカイブ済みカードのみが返る。
- [ ] `status = deleted` を指定すると、対象ボードの削除済みカードのみが返る。
- [ ] `status` 未指定または `active` 指定時、`active` カードのみが返る (既定挙動)。
- [ ] 検索と絞り込みを組み合わせた場合、全条件を満たすカードのみが返る (AND 合成)。
- [ ] 検索、絞り込みの結果が 0 件のとき、`{ items: [] }` を 200 で返す。
- [ ] 未ログインユーザーが検索 API を呼ぶと `401` が返る。
- [ ] 存在しない `boardId` を指定すると `404` が返る。
- [ ] 閲覧権限がないボードを指定すると `404` が返る。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコード` と `§ Route Handler の入口チェック順序` に従う。

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで API 呼出 | `401` | 検索 API |
| 存在しない `boardId` を指定 | `404` | 検索 API |
| 閲覧権限 (`viewer` 以上) のないボードを指定 | `404` | 存在有無を漏らさないため `404` に統一 |
| `member` / `owner` 以上のみが呼べる操作は本 spec に存在しない | — | 検索、絞り込みは `viewer` 以上で共通 |

### バリデーションエラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| `q` が 100 文字超過 | `422` | `q` | `too_long` |
| `q` が文字列でない (配列指定など) | `422` | `q` | `invalid_type` |
| `labelIds` と `labelsNone` の同時指定 | `422` | `labelIds` / `labelsNone` | `invalid_labels_options` |
| `labelIds` の中に別ボード所属のラベル ID を含む | `422` | `labelIds` | `invalid_labels` |
| 期限絞り込みオプションを 2 つ以上同時指定 (`dueDateNone` / `dueDateOverdue` / `dueDateToday` / `dueDateWithin7Days` / `dueDateFrom` + `dueDateTo` セット) | `422` | 該当オプション群 | `invalid_due_date_options` |
| `dueDateFrom` / `dueDateTo` が `YYYY-MM-DD` 形式でない | `422` | 該当フィールド | `invalid_format` |
| `dueDateFrom` / `dueDateTo` が日付として不正 | `422` | 該当フィールド | `invalid_date` |
| `dueDateFrom > dueDateTo` の関係が成立する期間指定 | `422` | `dueDateFrom` / `dueDateTo` | `invalid_range` |
| 担当者絞り込みオプションを 2 つ以上同時指定 (`assigneeMe` / `assigneeIds` / `assigneeNone`) | `422` | 該当オプション群 | `invalid_assignee_options` |
| `assigneeIds` が空配列 | `422` | `assigneeIds` | `empty_assignees` |
| `status` が `active` / `archived` / `deleted` 以外 | `422` | `status` | `invalid_status` |

### 画面レベル

- 検索、絞り込み API が `422` を返した場合、検索バーまたはフィルタ導線に該当エラーメッセージを表示し、直前の結果を保持する (画面をクリアしない)。
- 検索、絞り込み API が `403` を返すことは本 spec の設計上発生しない (`viewer` 以上で共通)。それでも受信した場合は「操作権限がありません」 相当の表示を行う。
- 検索、絞り込み API が `404` を返した場合、「ボードが見つかりません」 相当の表示を行い、ボード一覧画面 (`/`) に戻る導線を提示する。
- 検索、絞り込み結果が 0 件のとき、フィルタ済みの空状態を表示する (通常の空状態と区別する、詳細は `ui-design/`)。

## 境界条件

### `q`

- 0 文字 (未指定 / 空文字): 検索条件なしとして扱う。
- 1 文字 (下限): 受け付ける。
- 100 文字 (上限ちょうど): 受け付ける。
- 101 文字: `422` (`too_long`)。
- 全角空白 / 半角空白 / タブ: 空白として扱い、複数キーワード分割の区切りとする。
- キーワードにワイルドカードや正規表現メタ文字 (`%` / `_` / `*` / `?`) を含む: SQL 側でエスケープして部分一致に用いる (正規表現扱いはしない)。エスケープ方針は設計工程で決める。

### ラベル絞り込み

- `labelIds = []` (空配列): `labelsNone` としては扱わない。空配列は「指定なし」 と等価。
- `labelIds` に同一 ID を重複指定: 重複を除いて OR 合成する。
- `labelsNone = true` かつ `labelIds` 指定なし: 「ラベル 0 件のカードのみ」 を返す。

### 期限絞り込み

- 期限絞り込みオプション未指定: 期限フィルタなし (全カード対象)。
- `dueDateFrom` のみ指定: 開始以降 (`dueDate >= dueDateFrom`) の期限を持つカード。期限未設定 (`dueDate = null`) は除外。
- `dueDateTo` のみ指定: 終了以前 (`dueDate <= dueDateTo`) の期限を持つカード。期限未設定 (`dueDate = null`) は除外。
- `dueDateFrom = dueDateTo`: その日 1 日のみのカード。
- `dueDateWithin7Days` の 7 日は本日を含む。本日 + 6 日までの範囲。

### 担当者絞り込み

- `assigneeIds` に同一 ID を重複指定: 重複を除いて OR 合成する。
- `assigneeIds` に存在しないユーザー ID を含む: エラーを返さず、結果 0 件として扱う (存在有無を漏らさない)。
- `assigneeMe` は現在ユーザーが担当のカードのみを返す。現在ユーザーが対象ボードの `viewer` の場合も、自分を担当者に指定されているカードは返される。

### アーカイブ状態

- `status` 未指定: `active` として扱う。
- `status` に不正値 (例: `pending`): `422` (`invalid_status`)。
- `status = archived` 指定時、既存 `GET /api/boards/{boardId}/archived-cards` と結果は原則一致 (絞り込みなしの場合)。ソート順の差は設計工程で確認。

### 結果件数

- 結果 0 件: 200 で `{ items: [] }` を返す。
- 結果 1 件: 200 で `{ items: [Card] }` を返す。
- ページネーションなし (全件返却)。件数上限が問題になった場合の対応は `§ 未決事項`。

## バリデーション

| フィールド | ルール |
|---|---|
| `q` | 文字列 (省略可、既定 `""`)。0〜100 文字。101 以上で `422`。 |
| `labelIds` | 文字列配列 (省略可、既定 `[]`)。要素は同一ボード所属のラベル ID。 |
| `labelsNone` | 真偽値 (省略可、既定 `false`)。`labelIds` との同時指定不可。 |
| `dueDateNone` / `dueDateOverdue` / `dueDateToday` / `dueDateWithin7Days` | 真偽値 (省略可、既定 `false`)。相互排他、期間指定 (`dueDateFrom` / `dueDateTo`) とも排他。 |
| `dueDateFrom` / `dueDateTo` | 文字列 (`YYYY-MM-DD`、省略可)。両者の関係は `from <= to`。 |
| `assigneeMe` | 真偽値 (省略可、既定 `false`)。他担当者オプションと排他。 |
| `assigneeIds` | 文字列配列 (省略可、既定 `[]`)。空配列指定は `422`、省略は問題なし。他担当者オプションと排他。 |
| `assigneeNone` | 真偽値 (省略可、既定 `false`)。他担当者オプションと排他。 |
| `status` | 文字列 (`active` / `archived` / `deleted`、省略可、既定 `active`)。列挙外で `422`。 |
| `boardId` (URL パラメータ) | 文字列。存在しないと `404`。閲覧権限がないと `404`。 |

- クエリパラメータの真偽値変換は `true` / `false` の文字列を受け付ける (それ以外は `false` と解釈するか `422` を返すか、設計工程で決める。初期方針は文字列 `true` のみを真として扱う)。

## 権限境界

`spec/000_shared_rules.md § 権限マトリクス` に本 spec 追加操作を統合した表。

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| カード検索、絞り込み (`GET /api/boards/{boardId}/cards/search`) | 対象ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |

- `viewer` は検索と絞り込みを全条件で利用できる (アーカイブ / 削除済み含む、既存 archived / deleted 一覧の閲覧権限と整合)。
- `member` / `owner` は追加権限なし (検索、絞り込み自体は共通)。

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。本 spec 固有の要件は次の通り。

### 性能

- 検索 API は一覧 API として P95 200ms 以内。
- 検索対象件数の増加に応じて、SQLite 側のインデックス設計 (`title` / `description` の LIKE、`assigneeId`、`dueDate`、`CardLabel` の複合) を設計工程で決める。
- コメント本文検索は結合コストが高いため、初期実装で 1 ボードあたりカード数 1000、コメント総数 10000 を上限目安とし、上限超過時の挙動 (拒否 / 部分検索 / ページネーション) は `§ 未決事項` で扱う。

### 運用 (操作ログ)

- 検索、絞り込み API 呼出はログとして残さない (閲覧操作扱い、`constitution.md § 運用` の対象外)。ただしエラー応答 (`401` / `403` / `404` / `422`) は既存の運用要件に従いエラーログに記録する。

### セキュリティ

- `constitution.md § セキュリティ` に従う。追加要件なし。
- SQL インジェクション対策は Prisma のプレースホルダを前提とする。LIKE 検索時のワイルドカード文字 (`%` / `_`) は文字列としてエスケープする。

## 使用する用語

以下の用語は `constitution.md § 用語集` を参照する。

- ボード (Board)
- カード (Card)
- ラベル (Label) — `spec/006_label.md` で導入
- 期限 (Due Date)
- 担当者 (Assignee)
- アーカイブ (Archive)
- コメント (Comment)

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`
- `spec/004_card_movement_archive_restore.md`
- `spec/005_card_detail.md`
- `spec/006_label.md`
- `spec/007_due_date.md`
- `inputs/005_008_ui_features_spec_input.md`

## 未決事項

- 検索キーワードの複数キーワードの区切り文字 (半角空白 / 全角空白 / タブの正規化) は設計工程で決める。
- 検索の非 ASCII 文字 (日本語) の大文字小文字判定は SQLite の挙動に依存する。ケース非依存を全言語で保証するかは設計工程で決める。
- ワイルドカード文字のエスケープ方針 (`%` / `_` の扱い、ESCAPE 句) は設計工程で決める。
- 結果 0 件を検索キーワードのみで発生させたときの「サジェスト」 「関連キーワード」 は本 spec の対象外。
- 検索履歴、保存済みフィルタは本 spec の対象外。
- ページネーション、無限スクロール、上限超過時の挙動 (ボード内カード 1000 超) は本 spec の対象外 (別 spec で扱う)。
- 検索、絞り込みを URL クエリで永続化 (`/boards/[id]?q=...&labelIds=...`) するかは `ui-design/` で決める。
- 全ボード横断検索 (現在は 1 ボード内) は本 spec の対象外。
- `assigneeMe` の判定タイミング (現在ユーザーが変わった際のキャッシュ挙動) は設計工程で決める。
- 検索、絞り込み結果の並び順切替 (`updatedAt` 昇順 / `dueDate` 昇順 / `title` 昇順) は本 spec の対象外。
- コメント本文にヒットしたカードで、どのコメントがマッチしたかを結果に含めるか (`matchedCommentIds` フィールド追加) は設計工程で決める。
