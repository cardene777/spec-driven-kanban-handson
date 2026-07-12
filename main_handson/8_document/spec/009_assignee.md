# 担当者割り当ての仕様

## 概要

本 file はカードに担当者 (Assignee) を割り当てる機能の仕様を定義する。
1 カードに対して複数の担当者 (最大 10 名) を設定できる。
共通ルールは `spec/000_shared_rules.md`、カード基本仕様は `spec/003_cards.md`、カード詳細モーダルの構成は `spec/005_card_detail.md` を参照する。
`constitution.md § 用語集` の「担当者 (Assignee)」 を対象とし、`constitution.md § 権限ポリシー` に従って権限境界を定義する。

## 既存仕様との関係

- `spec/005_card_detail.md § 対象データ` は `assigneeId: 文字列 / null` の単一担当者モデルを定義していた。本 spec で「1 カードに最大 10 名の複数担当者」 モデルに刷新する。
- 本 spec は担当者の SSOT を提供する。カード詳細モーダル内の担当者領域 (`spec/005_card_detail.md § 機能要件`) は本 spec の API と表示規則を参照する。
- 単一担当者用の API (`PATCH /api/cards/{cardId}/assignee`) は本 spec の API 群 (`POST` / `DELETE` / `GET /api/cards/{cardId}/assignees`) に置き換える。
- `spec/003_cards.md § 未決事項` の「担当者欄の配置は本 spec の対象外」 と `spec/000_shared_rules.md § 未決事項` の「担当者機能は別 spec で決める」 を本 spec が引き受ける。

## 対象データ

### CardAssignee エンティティ (中間データ)

カードとユーザーの多対多関係を担う中間データのフィールド。

| フィールド | 型 | 説明 |
|---|---|---|
| `cardId` | 文字列 | 担当対象のカード ID |
| `userId` | 文字列 | 担当ユーザー ID |
| `createdAt` | ISO8601 UTC | 割当日時 |

- `(cardId, userId)` の組合せは一意である (同一カードに同一ユーザーを 2 度登録できない)。
- 主キーと ID 表現の詳細 (複合キー / サロゲート ID) は設計工程で決める。本 spec は「(`cardId`, `userId`) の一意性」 と「割当日時の保存」 のみを要求する。
- 割当対象は対象ボードに所属するユーザー (`viewer` 以上) に限る。

### User エンティティの前提

- 本 spec は「認証機構が既に存在し、Route Handler で現在ユーザーを取得できる」 (`spec/000_shared_rules.md § 認証の前提`) を継承する。
- ユーザーの識別子 (`userId`) は文字列型、対象ボードに対して `owner` / `member` / `viewer` のいずれかのロールを持ちうる。

## 機能要件

### FR-01: カードに担当者を追加する

- カード詳細モーダルの担当者領域から「担当者を追加する」 導線で実行する。
- 入力項目は `userId` のみ (`cardId` は URL から特定する)。
- 追加後、対象カードの担当者一覧の末尾に追加され、`createdAt` は追加時刻となる。
- 追加時、対象カードの `updatedAt` を更新する。

観測可能な完了条件

- [ ] `POST /api/cards/{cardId}/assignees` に `member` 以上のユーザーが `viewer` 以上のボードメンバーの `userId` を送ると、`201` と割当結果 (`CardAssignee` オブジェクト) が返る。
- [ ] 追加後、`GET /api/cards/{cardId}/assignees` のレスポンスに追加ユーザーが含まれる。
- [ ] 追加後、対象カードの `updatedAt` が追加時刻に更新されている。

### FR-02: カードから担当者を削除する

- カード詳細モーダルの担当者バッジ横の解除導線から実行する。
- 削除対象は `userId` で指定する。
- 削除時、対象カードの `updatedAt` を更新する。
- 削除操作は物理削除 (soft delete しない)。

観測可能な完了条件

- [ ] `DELETE /api/cards/{cardId}/assignees/{userId}` に `member` 以上のユーザーが割当済みユーザーの `userId` を指定すると、`204` (body なし) が返る。
- [ ] 削除後、`GET /api/cards/{cardId}/assignees` のレスポンスから当該ユーザーが除外されている。
- [ ] 削除後、対象カードの `updatedAt` が削除時刻に更新されている。

### FR-03: カードの担当者一覧を取得する

- カード詳細モーダルを開く時、または担当者領域の初期表示時に取得する。
- 一覧は割当順 (`createdAt` 昇順、同時刻は `userId` 昇順で解決) で返す。
- 一覧のレスポンス形式は `spec/000_shared_rules.md § 一覧 API のレスポンス構造` に従う。

観測可能な完了条件

- [ ] `GET /api/cards/{cardId}/assignees` に `viewer` 以上のユーザーがアクセスすると、`200` と `{ items: CardAssignee[] }` が返る。
- [ ] レスポンスの `items` は `createdAt` 昇順、同時刻時は `userId` 昇順で並ぶ。
- [ ] 担当者 0 人のカードは `{ items: [] }` を `200` で返す。

### FR-04: カード詳細画面に担当者を表示する

- カード詳細モーダルの担当者領域に、担当者一覧を表示する。
- 表示は割当順 (`createdAt` 昇順) とする。
- 担当者 0 人時は「未割当」 相当のプレースホルダを表示する (文言は `ui-design/`)。
- 担当者名またはアバターの表現、追加導線 / 解除導線の配置は `ui-design/` で決める。

観測可能な完了条件

- [ ] カード詳細モーダルを開くと、担当者領域に `GET /api/cards/{cardId}/assignees` のレスポンス順に担当者名 (またはアバター) が表示される。
- [ ] 担当者 0 人のカードは、担当者領域に「未割当」 相当のプレースホルダが表示される。
- [ ] `member` 以上のユーザーには、担当者領域に追加導線と各担当者バッジ横の解除導線が表示される。
- [ ] `viewer` ユーザーには、担当者領域に一覧のみが表示され、追加導線と解除導線は表示されない。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `GET` | `/api/cards/{cardId}/assignees` | 指定カードの担当者一覧を取得 | 対象ボードの `viewer` 以上 |
| `POST` | `/api/cards/{cardId}/assignees` | 指定カードに担当者を追加 | 対象ボードの `member` 以上 |
| `DELETE` | `/api/cards/{cardId}/assignees/{userId}` | 指定カードから担当者を削除 | 対象ボードの `member` 以上 |

- レスポンス形式と認証チェック順序は `spec/000_shared_rules.md` に従う。
- 一覧 API のレスポンスは `{ items: CardAssignee[] }`、追加 API のレスポンスは作成された `CardAssignee` オブジェクトを `201` で返す。
- `POST /api/cards/{cardId}/assignees` のリクエスト body は `{ "userId": <文字列> }`。
- `DELETE /api/cards/{cardId}/assignees/{userId}` は成功時に `204` (body なし) を返す。

## 受入条件

FR ごとの完了条件は `§ 機能要件` の各 FR に記載する。以下は FR を横断する統合条件。

- [ ] 担当者 0 人のカードに `member` が `POST /api/cards/{cardId}/assignees` で 1 人目を追加すると `201` が返り、一覧が 1 件になる。
- [ ] 担当者 9 人のカードに 10 人目を追加すると `201` が返り、一覧が 10 件になる。
- [ ] 担当者 10 人のカードに 11 人目を追加すると `422` (`assignees_limit_exceeded`) が返り、一覧は 10 件のまま変わらない。
- [ ] 既に割当済みのユーザーを再度 `POST` すると `409` (`already_assigned`) が返り、一覧の件数と順序は変わらない。
- [ ] 対象ボードの `viewer` 以上ではないユーザーの `userId` を `POST` すると `422` (`assignee_not_in_board`) が返る。
- [ ] 存在しない `userId` を `POST` すると `422` (`assignee_not_found`) が返る。
- [ ] 存在しない `cardId` を指定した全 API 呼出で `404` が返る。
- [ ] 対象カードが所属するボードの閲覧権限を持たないユーザーが全 API を呼ぶと `404` が返る (存在有無の露出を防ぐため)。
- [ ] `viewer` ロールのユーザーが `POST` / `DELETE` を呼ぶと `403` が返る。
- [ ] `viewer` ロールのユーザーが `GET` を呼ぶと `200` が返る。
- [ ] 未ログインユーザーが本 spec のいずれの API を呼んでも `401` が返る。
- [ ] `POST` の body で `userId` が未指定または空文字なら `422` (`userId`, `required`) が返る。
- [ ] `POST` の body で `userId` が文字列でないなら `422` (`userId`, `invalid_type`) が返る。
- [ ] カード詳細モーダルを開くと、担当者領域に一覧 API の結果が割当順で表示される。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコード` と `§ Route Handler の入口チェック順序` に従う。
本 spec では、上記 4 種類のステータスコードに加え、重複登録時のみ `409 Conflict` を用いる (`spec/000_shared_rules.md § HTTP ステータスコード` の 4 種類は変更せず、本 spec 固有の追加ステータスコードとして扱う)。

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで本 spec の API 呼出 | `401` | 全 API 共通 |
| 存在しない `cardId` を指定 | `404` | 全 API 共通 |
| 対象カードが所属するボードの閲覧権限 (`viewer` 以上) がない | `404` | 存在有無を漏らさないため `404` に統一 |
| 削除 API で対象カードには存在するが、指定 `userId` が担当者に含まれていない | `404` | 存在しない担当関係を削除できないため |
| `viewer` ロールが `POST /api/cards/{cardId}/assignees` を呼ぶ | `403` | 認証済み、閲覧可の状態が前提 |
| `viewer` ロールが `DELETE /api/cards/{cardId}/assignees/{userId}` を呼ぶ | `403` | 認証済み、閲覧可の状態が前提 |

### 状態エラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| 既に割当済みのユーザーを再度 `POST` | `409` | `userId` | `already_assigned` |
| 担当者 10 人のカードに 11 人目を `POST` | `422` | `userId` | `assignees_limit_exceeded` |

### バリデーションエラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| `userId` 未指定または空文字 | `422` | `userId` | `required` |
| `userId` が文字列型でない | `422` | `userId` | `invalid_type` |
| `userId` が存在するユーザーとして解決できない | `422` | `userId` | `assignee_not_found` |
| `userId` が対象ボードに所属しない (`viewer` 以上のロールを持たない) | `422` | `userId` | `assignee_not_in_board` |

### 画面レベル

- 担当者候補一覧の取得に失敗した場合、担当者領域内に「担当者候補を取得できませんでした。再試行してください」 相当の表示を行う (文言は `ui-design/`)。
- `POST` API が `409` を返した場合、追加フォーム直下に「このユーザーは既に担当者に設定されています」 相当のメッセージを表示する。
- `POST` API が `422` (`assignees_limit_exceeded`) を返した場合、「担当者は最大 10 名までです」 相当のメッセージを表示する。
- `POST` API が `422` (`assignee_not_in_board`) を返した場合、「このユーザーはボードメンバーではありません」 相当のメッセージを表示する。
- `POST` / `DELETE` API が `403` を返した場合、「操作権限がありません」 相当の表示を行う。
- `DELETE` API が `404` を返した場合 (他ユーザーが同時に解除した等)、担当者領域を再取得して最新状態に整合させる。

## 境界条件

### 担当者数

- 担当者 0 人 (下限): `GET` は `{ items: [] }` を `200` で返す。
- 担当者 1 人 (下限 +1): `GET` は `{ items: [1 件] }` を `200` で返す。
- 担当者 10 人 (上限ちょうど): `GET` は `{ items: [10 件] }` を `200` で返す。
- 担当者 10 人のカードに 11 人目を `POST`: `422` (`assignees_limit_exceeded`) を返し、一覧は 10 件のまま変わらない。

### 追加時の重複判定

- 既に担当者として設定済みの `userId` を `POST`: `409` (`already_assigned`) を返し、一覧の件数と順序は変わらない。
- 割当を解除した直後 (`DELETE` 直後) に同一 `userId` を `POST`: 受け付ける (`createdAt` は新規追加時刻となり、一覧末尾に配置される)。

### 存在しないリソース

- 存在しない `cardId` を指定した全 API 呼出: `404` を返す。
- `POST` で存在しない `userId` を指定: `422` (`assignee_not_found`) を返す。
- `DELETE` で存在する `cardId` に対して未割当の `userId` を指定: `404` を返す (存在しない担当関係)。

### ロール別の視認性

- 対象ボードの `viewer`: `GET` は `200` で成功、`POST` / `DELETE` は `403`。
- 対象ボードの `member`: `GET` / `POST` / `DELETE` すべて許可。
- 対象ボードの `owner`: `member` と同じ (本 spec で追加権限なし)。
- 対象ボードに所属しないユーザー: `404` を返す (閲覧権限がないため存在有無を漏らさない)。

## バリデーション

| フィールド | ルール |
|---|---|
| `cardId` (URL パラメータ) | 文字列。存在しないと `404`。 |
| `userId` (URL パラメータ、`DELETE` のみ) | 文字列。担当関係が存在しないと `404`。 |
| `userId` (`POST` body) | 文字列 (`invalid_type` 判定は他フィールドに先行)。空文字は `required`。存在しないユーザーは `assignee_not_found`。対象ボードの `viewer` 以上でないユーザーは `assignee_not_in_board`。既に担当者として設定済みなら `already_assigned` (`409`)。担当者数が既に 10 名なら `assignees_limit_exceeded`。 |

- `POST` API で受け付けるのは `userId` のみ。`cardId` / `createdAt` はサーバー側で決定する。
- `DELETE` API で受け付けるのは URL パラメータの `cardId` と `userId` のみ (body なし)。
- `GET` API はクエリパラメータを受け取らない (フィルタ、ページネーションは対象外)。

## 権限境界

`spec/000_shared_rules.md § 権限マトリクス` と本 spec 追加操作を統合した表。

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| 担当者一覧取得 (`GET /api/cards/{cardId}/assignees`) | 対象ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |
| 担当者追加 (`POST /api/cards/{cardId}/assignees`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404` |
| 担当者削除 (`DELETE /api/cards/{cardId}/assignees/{userId}`) | 対象ボードの `member` 以上 | 未ログイン `401`、`viewer` は `403`、閲覧不可 `404` |

- 追加、削除の権限は「対象カードが所属するボードでの `member` 以上」 で判定する。追加対象ユーザー (`userId`) 自身のロールは `viewer` 以上であればよい (viewer をアサインしてよい)。
- 自分自身を担当者に追加、または自分自身の担当を解除する場合も、上記の必要権限に従う (自身アサインの特別扱いはしない)。

## カード詳細画面での表示

- カード詳細モーダルの担当者領域 (`spec/005_card_detail.md § カード詳細モーダルの拡張構造` の担当者領域を継承) に、本 spec の一覧 API の結果を割当順で表示する。
- 担当者名またはアバターの表現、担当者バッジの装飾、追加導線 (「担当者を追加する」)、解除導線 (バッジ横のアイコン) の配置は `ui-design/` で決める。
- 担当者 0 人時は「未割当」 相当のプレースホルダを表示する。
- 追加導線と解除導線は `member` 以上にのみ表示する (`viewer` には一覧のみ)。
- 追加 UI から `POST` が `409` / `422` を返した場合、フィールド別エラーメッセージ (`§ 異常系 § 画面レベル`) をフォーム直下に表示する。

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。本 spec 固有の要件は次の通り。

### 性能

- 担当者一覧 API は一覧 API として P95 200ms 以内。
- 担当者追加 / 削除 API は書き込み API として P95 300ms 以内。

### 運用 (操作ログ)

- 担当者追加、削除の各操作について、操作種別 (`card_assignee_add` / `card_assignee_remove`)、対象識別子 (`cardId`)、担当対象 (`userId`)、対象ボード識別子 (`boardId`)、操作ユーザー識別子、タイムスタンプを操作ログに残す。
- エラーレスポンスを返した場合、ステータス、エラーコード、対象 `cardId`、指定 `userId` (取得できる範囲)、操作ユーザー識別子をログに記録する。

### セキュリティ

- `constitution.md § セキュリティ` に従う。追加要件なし。

## 使用する用語

以下の用語は `constitution.md § 用語集` を参照する。

- カード (Card)
- 担当者 (Assignee)
- ボード (Board) — 権限境界の判定単位として参照

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`
- `spec/005_card_detail.md`
- `inputs/009_assignee_spec_input.md`

## 未決事項

- 担当者候補一覧 API (対象ボードの `viewer` 以上のメンバーを取得する API、例 `GET /api/boards/{boardId}/members`) は本 spec の対象外。追加 UI の候補提示方法は `ui-design/` で決め、必要になった時点で別 spec で定義する。
- 担当者のアバター画像、担当者名の表示形式、追加 UI (検索、選択、autocomplete) の詳細は `ui-design/` で決める。
- 割当済み担当者が対象ボードから外れた場合の自動クリーンアップ (`CardAssignee` の物理削除) は本 spec の対象外。初期方針は保持のまま表示し、再取得時にボードメンバー判定で「（無効な担当者）」 相当のプレースホルダに切り替える。
- 担当者に対する通知 (アサインされたユーザーへのメール、in-app 通知) は本 spec の対象外。
- 担当者による絞り込み (`GET /api/lists/{listId}/cards?assigneeId={userId}` 等) は本 spec の対象外。`spec/008_search_filter.md` の対象範囲で扱う。
- `spec/005_card_detail.md` の既存記述 (`assigneeId: 文字列 / null`、`PATCH /api/cards/{cardId}/assignee`) は本 spec への移行時に別途更新する。両者の同時共存は想定しない。
