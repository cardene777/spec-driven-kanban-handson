# メンバー招待機能の仕様

## 概要

本 file はボード (Board) に対するメンバー招待 (Invite) 機能の仕様を定義する。
対象操作は招待の作成、招待リンクの発行、招待の承認、招待の再送、招待の失効の 5 種類とする。
共通ルールは `spec/000_shared_rules.md`、ボード基本仕様は `spec/001_boards.md`、認証機構は `spec/011_auth.md`、権限管理は `spec/013_permissions.md` を参照する。
`constitution.md § 権限ポリシー` に従い、招待作成は `owner` のみ、承認は招待リンクの受領者のみが行える。

## 既存仕様との関係

- `spec/000_shared_rules.md § 未決事項` の「ボードに対するメンバー招待と権限変更の UI と API は別 spec で決める」 と、`spec/011_auth.md § 対象データ § User エンティティ` の登録済みユーザーを、本 spec が「招待経由でボードに `BoardMembership` を追加する」 経路として結ぶ。
- ボード作成時に作成者を `owner` として `BoardMembership` に登録する経路 (`design/001_boards.md § API 設計 § POST /api/boards`) は変更しない。招待経由の追加は `member` / `viewer` に限る (`owner` は招待できない、`§ 権限境界`)。

## 対象データ

### Invite エンティティ (新設)

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | 招待を一意に識別する ID |
| `boardId` | 文字列 | 招待先ボード ID |
| `email` | 文字列 | 招待メールアドレス (小文字化して保存) |
| `role` | `member` / `viewer` | 承認後に付与するロール (`owner` は選択不可) |
| `token` | 文字列 | 招待リンクに含める URL-safe な秘密トークン (`§ 非機能要件 § セキュリティ`) |
| `status` | `pending` / `accepted` / `revoked` | 招待の状態 |
| `expiresAt` | ISO8601 UTC | 招待の有効期限 (発行時点 + 7 日) |
| `invitedBy` | 文字列 | 招待を作成した User ID |
| `createdAt` | ISO8601 UTC | 招待作成日時 |
| `updatedAt` | ISO8601 UTC | 招待更新日時 |

- `(boardId, email)` の組合せは `status = pending` の状態で 1 件までとする (同じボードに同じメールアドレスで pending が 2 件並ばない)。既に `pending` がある状態で再作成すると再送とみなす (`§ FR-04`)。
- `token` は招待リンクの識別子として使う。DB に保存する `token` はハッシュ化した値とし、平文はメール / UI へ 1 度だけ返す (`§ 非機能要件 § セキュリティ`)。
- `status` の遷移は `pending → accepted` (承認)、`pending → revoked` (失効)、`accepted / revoked → *` (最終状態、以降変化しない) の 3 経路のみ。
- `expiresAt` を過ぎた `pending` は事実上失効扱い (承認 API で `410 Gone` を返す)。ステータスは `pending` のまま保持する (自動遷移させない、履歴として残す)。

### BoardMembership エンティティ (既存)

招待の承認結果を `BoardMembership` に追加する。既存フィールドは `design/001_boards.md § データモデル > Prisma スキーマ` を参照。

- 承認時、`(boardId, userId, role)` を追加する。既に同ユーザーが同ボードのメンバーである場合は追加しない (`§ FR-03`)。

## 機能要件

### FR-01: owner が招待を作成する

- ボード詳細画面のメンバー管理領域から `owner` が実行する。
- 入力項目は `email` / `role` の 2 項目 (`role` は `member` または `viewer`)。
- 招待作成後、招待リンクの平文 `token` が UI と API レスポンスに 1 度だけ返る (以降 API では取得できない)。
- 招待の有効期限は発行時点 + 7 日。
- 同一 `(boardId, email)` で `pending` の招待が既に存在する場合、新規作成ではなく再送 (`§ FR-04`) 扱い。
- 対象 `email` が既に対象ボードの `BoardMembership` を持つ場合、`422` (`email`, `already_member`) を返す。

観測可能な完了条件

- [ ] `POST /api/boards/{boardId}/invites` に `owner` が `email` = 未登録メール、`role` = `member` を送ると `201` と `{ invite: { id, email, role, status: "pending", expiresAt }, token: <平文 token>, url: <招待 URL> }` が返る。
- [ ] 作成された Invite の `token` は DB にハッシュ化されて保存されており、レスポンスの `token` と DB 値は一致しない。
- [ ] 作成された Invite の `expiresAt` は `createdAt + 7 日` (ミリ秒レベルの誤差は許容)。
- [ ] `role` = `owner` を送ると `422` (`role`, `invalid_value`) が返る。
- [ ] `email` が既に対象ボードのメンバーである場合 `422` (`email`, `already_member`) が返る。

### FR-02: 招待リンクの発行と閲覧

- 招待作成 API のレスポンス body に招待 URL (`/invites/{token}` 形式) を含める。
- 招待 URL は認証なしで開ける (未ログインでも招待内容の閲覧のみ可能)。
- 招待内容の閲覧 API (`GET /api/invites/{token}`) は招待の `boardId` / `boardTitle` / `role` / `expiresAt` / `status` を返す。
- `token` は URL-safe な文字列 (英数字とハイフンのみ、記号は含めない)。
- 一度発行した招待 URL の平文 `token` は API から再取得できない (再送で新 `token` を発行する経路のみ、`§ FR-04`)。

観測可能な完了条件

- [ ] `GET /api/invites/{token}` に有効な `token` を送ると `200` と `{ boardId, boardTitle, role, status, expiresAt }` が返る。
- [ ] 存在しない `token` を送ると `404` (`not_found`) が返る。
- [ ] 期限切れの招待 (`expiresAt < now`) の場合、`GET` は `200` を返すが `status` フィールドは `pending` のまま (自動遷移させない)、レスポンスに `expired: true` を含める。承認 API を叩くと `410` を返す (`§ FR-03`)。
- [ ] `status` = `accepted` / `revoked` の場合、`GET` は `200` と現状態を返す。承認 API は `410` を返す。

### FR-03: 招待の承認

- ログイン中ユーザーが招待リンク (`/invites/{token}`) から実行する。
- 承認 API は `token` を検証し、招待先ボードの `BoardMembership` にログインユーザー ID + 招待 `role` で 1 件追加する。
- 承認後、招待の `status` を `accepted` に遷移させ、以降同 `token` は使えない。
- ログインユーザーの `email` と招待の `email` が一致しなくても承認可能とする (`§ 未決事項`)。

観測可能な完了条件

- [ ] ログイン中ユーザーが `POST /api/invites/{token}/accept` に有効な `token` を送ると `200` と `{ boardId, role }` が返り、`BoardMembership` に対応する行が追加される。
- [ ] 承認後、同じ `token` で再度 `POST` すると `410` (`already_used`) が返る。
- [ ] 期限切れ (`expiresAt < now`) の招待を承認しようとすると `410` (`expired`) が返る。
- [ ] `status` = `revoked` の招待を承認しようとすると `410` (`revoked`) が返る。
- [ ] 未ログインで `POST` すると `401` が返る。
- [ ] 承認ユーザーが既に対象ボードのメンバーである場合、`BoardMembership` を追加せず `409` (`already_member`) を返す (招待は消費しない = `status` は `pending` のまま)。

### FR-04: 招待の再送

- `owner` がボード詳細画面のメンバー管理領域から実行する。
- 対象は `(boardId, email)` で識別する既存の `pending` 招待。
- 再送 API は既存 `Invite` レコードの `token` を新規発行し、`expiresAt` を現在時刻 + 7 日で再計算する。
- レスポンスは新 `token` と招待 URL を含める (作成時と同形式)。
- `status` は `pending` のまま、`updatedAt` は更新する。

観測可能な完了条件

- [ ] `owner` が `POST /api/boards/{boardId}/invites/{inviteId}/resend` を呼ぶと `200` と `{ invite, token: <新平文 token>, url: <新招待 URL> }` が返る。
- [ ] 再送前の平文 `token` は無効化される (旧 `token` で `GET /api/invites/{token}` を叩くと `404`)。
- [ ] `status` = `accepted` / `revoked` の招待に対する再送は `422` (`status`, `not_pending`) を返す。
- [ ] `expiresAt` が既に過ぎた `pending` に対して再送すると `expiresAt` が更新され再有効化される (再送を許容する、`§ 未決事項` )。
- [ ] `owner` 以外が再送 API を呼ぶと `403` が返る。

### FR-05: 招待の失効

- `owner` がボード詳細画面のメンバー管理領域から実行する。
- 対象は `Invite.id` で指定する。
- 失効 API は `Invite.status` を `revoked` に遷移させる。以降、承認 API は `410 revoked` を返す。
- 既に `accepted` / `revoked` の招待に対する失効は `422` (`status`, `not_pending`) を返す。

観測可能な完了条件

- [ ] `owner` が `POST /api/boards/{boardId}/invites/{inviteId}/revoke` を呼ぶと `200` と `{ invite: { id, status: "revoked" } }` が返る。
- [ ] 失効後、対応する `token` の承認 API は `410` (`revoked`) を返す。
- [ ] `status` = `accepted` の招待に対する失効は `422` (`status`, `not_pending`) を返す。
- [ ] `owner` 以外が失効 API を呼ぶと `403` が返る。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `GET` | `/api/boards/{boardId}/invites` | 対象ボードの招待一覧 (`pending` のみ) | 対象ボードの `owner` |
| `POST` | `/api/boards/{boardId}/invites` | 招待を新規作成 | 対象ボードの `owner` |
| `POST` | `/api/boards/{boardId}/invites/{inviteId}/resend` | 招待の再送 (新 token 発行) | 対象ボードの `owner` |
| `POST` | `/api/boards/{boardId}/invites/{inviteId}/revoke` | 招待を失効させる | 対象ボードの `owner` |
| `GET` | `/api/invites/{token}` | 招待内容の閲覧 (認証不要) | 認証不要 |
| `POST` | `/api/invites/{token}/accept` | 招待を承認 | ログイン済み |

- レスポンス形式と認証チェック順序は `spec/000_shared_rules.md` に従う。
- 招待作成 / 再送 API のレスポンスは `{ invite: Invite, token: <平文>, url: <招待 URL> }`。平文 `token` はこのレスポンス以外では返さない。
- 招待閲覧 API のレスポンスは `{ boardId, boardTitle, role, status, expiresAt, expired }` (`invite.email` は返さない、存在露出防止)。
- 承認 API のレスポンスは `{ boardId, role }`。
- 失効 API のレスポンスは `{ invite: { id, status } }`。
- 招待一覧 API のレスポンスは `{ items: Invite[] }`、`token` (ハッシュ済み) は含めない。

## 受入条件

FR ごとの完了条件は `§ 機能要件` の各 FR に記載する。以下は FR を横断する統合条件。

- [ ] `owner` が招待作成 → 別ユーザーがログイン → 招待 URL 経由で承認 → 対象ボードの `BoardMembership` に追加されている。
- [ ] `owner` が `role` = `member` で招待し承認されると、承認ユーザーのロールは `member`。
- [ ] `owner` が `role` = `viewer` で招待し承認されると、承認ユーザーのロールは `viewer`。
- [ ] `owner` が `role` = `owner` で招待作成しようとすると `422` (`role`, `invalid_value`) が返る。
- [ ] `member` / `viewer` が招待作成 API を呼ぶと `403` が返る。
- [ ] 未ログインユーザーが招待作成 API を呼ぶと `401` が返る。
- [ ] 存在しない `boardId` を指定した招待作成 API は `404` が返る。
- [ ] `owner` ではないが対象ボードのメンバー (`member` / `viewer`) が招待作成 API を呼ぶと `403` が返る。
- [ ] 対象ボードのメンバーでないユーザー (`owner` を含む他ボードのユーザー) が招待作成 API を呼ぶと `404` が返る (存在露出防止)。
- [ ] 招待作成後、レスポンスの `token` を保存し、以降 API では `token` の平文取得ができない (`GET /api/boards/{boardId}/invites` にも `token` は含まれない)。
- [ ] `expiresAt` を過ぎた招待は承認 API で `410` (`expired`)、閲覧 API で `expired: true` が返る。
- [ ] `revoked` の招待は承認 API で `410` (`revoked`) が返る。
- [ ] `accepted` の招待を再度承認しようとすると `410` (`already_used`) が返る。
- [ ] 承認ユーザーが既に対象ボードのメンバーである場合、承認 API は `409` (`already_member`) を返し、招待は消費されない。
- [ ] 招待の作成 / 再送 / 失効 / 承認に成功すると、操作ログに `event` / `actorId` / `boardId` / `inviteId` / `role` が記録される。
- [ ] 招待失効 / 承認 / 期限切れ判定のいずれのログにも招待の平文 `token` を記録しない (`§ 非機能要件 § セキュリティ`)。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコード` の 4 種 (401 / 403 / 404 / 422) に加え、本 spec では以下の追加ステータスコードを用いる。

| 追加ステータス | 用途 | レスポンス body |
|---|---|---|
| `409 Conflict` | 承認ユーザーが既にメンバー | `{ "error": "conflict", "fields": { "userId": "already_member" } }` |
| `410 Gone` | 招待が期限切れ / 使用済み / 失効済み | `{ "error": "gone", "reason": "expired" \| "already_used" \| "revoked" }` |

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで招待作成 / 再送 / 失効 / 承認 API を呼ぶ | `401` | body = `{ "error": "unauthorized" }` |
| 存在しない `boardId` を指定した owner 用 API | `404` | 一覧 / 作成 / 再送 / 失効 |
| 対象ボードの `owner` 以外がボード配下の招待 API を呼ぶ | `403` | 認証済み、閲覧可の状態が前提 |
| 対象ボードに所属しないユーザーが招待 API を呼ぶ | `404` | 存在露出防止 (`spec/001_boards.md § 異常系` と同じ方針) |
| 存在しない `token` を招待閲覧 / 承認 API に指定 | `404` | body = `{ "error": "not_found" }` |
| 期限切れの `token` を承認 API に指定 | `410` | `{ "reason": "expired" }` |
| `revoked` の `token` を承認 API に指定 | `410` | `{ "reason": "revoked" }` |
| `accepted` の `token` を承認 API に指定 | `410` | `{ "reason": "already_used" }` |
| 承認ユーザーが既に対象ボードのメンバー | `409` | 招待は消費しない |

### バリデーションエラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| `email` 未指定または空文字 | `422` | `email` | `required` |
| `email` が文字列型でない | `422` | `email` | `invalid_type` |
| `email` がメール形式でない | `422` | `email` | `invalid_format` |
| `email` が既に対象ボードのメンバー | `422` | `email` | `already_member` |
| `role` 未指定 | `422` | `role` | `required` |
| `role` が `member` / `viewer` 以外 | `422` | `role` | `invalid_value` |
| `role` = `owner` を指定 | `422` | `role` | `invalid_value` |
| 再送 / 失効対象の招待が `status ≠ pending` | `422` | `status` | `not_pending` |

### 画面レベル

- 招待作成 UI が `422` を返した場合、フィールド別エラーメッセージを form 直下に表示する。
- 招待作成 UI が `403` / `404` を返した場合、「操作権限がありません」 相当の表示を行う。
- 招待閲覧 UI (招待 URL のランディング画面) で `expired: true` の場合、「この招待は期限切れです」 相当の表示を行う。承認ボタンは非活性。
- 承認 UI で `410` を検出した場合、`reason` に応じたメッセージを表示する (「使用済み」 / 「期限切れ」 / 「失効済み」)。
- 承認 UI で `409` (`already_member`) を検出した場合、「既にこのボードのメンバーです」 相当の表示 + 該当ボードへの遷移導線を出す。

## 境界条件

### 招待の有効期限

- 発行時点から 7 日ちょうど (168 時間) は承認可能。
- 発行時点から 7 日 + 1 秒経過後: 承認は `410 expired`。
- 期限切れ後も招待レコードは物理削除しない (履歴として保持)。
- 再送 API 実行時、`expiresAt` は「現在時刻 + 7 日」 に更新される (発行時からの累積延長ではない)。

### `role` の値

- 受け付ける値: `member` / `viewer` の 2 値のみ。
- `owner` を指定: `422 invalid_value`。
- 大文字 (`MEMBER` / `VIEWER`) や別値 (`admin`): `422 invalid_value`。

### 同一 `(boardId, email)` の重複

- `pending` が 1 件既に存在する状態で作成 API を呼ぶ: `422` (`email`, `pending_exists`) を返し、再送経路を案内する。
- `accepted` / `revoked` の履歴があっても、新規 `pending` 作成は可能 (別の招待レコードとして扱う)。

### 存在しないリソース

- 存在しない `boardId` を指定した owner 用 API: `404`。
- 存在しない `inviteId` を指定した再送 / 失効 API: `404`。
- 存在しない `token` を指定した閲覧 / 承認 API: `404`。

### 招待閲覧の権限

- 認証不要で閲覧可能。ただし、`token` の秘密性で保護する (推測困難な URL-safe ランダム文字列)。
- レスポンスに `boardTitle` を含めるため、招待を受け取った者はボード名を知りうる (`§ 非機能要件 § セキュリティ`)。

## バリデーション

| フィールド | ルール |
|---|---|
| `boardId` (URL) | 文字列。存在しないと `404`。 |
| `inviteId` (URL) | 文字列。存在しないと `404`。 |
| `token` (URL) | 文字列。存在しないと `404`。 |
| `email` (`POST` body) | 文字列 (`invalid_type` 判定を先に行う)。空文字は `required`。メール形式 (`§ 境界条件`)。既に対象ボードのメンバーなら `already_member`。同一ボードに `pending` 招待が既にあれば `pending_exists`。 |
| `role` (`POST` body) | 文字列。`member` / `viewer` のみ受け付ける。それ以外は `invalid_value`。 |

- `POST /api/boards/{boardId}/invites/{inviteId}/resend` / `revoke` は body を受け付けない。
- `POST /api/invites/{token}/accept` は body を受け付けない (Cookie 認証のみ)。
- `GET /api/invites/{token}` は認証情報も body も不要 (`token` のみで判定)。

## 権限境界

`spec/000_shared_rules.md § 権限マトリクス` と本 spec 追加操作を統合した表。

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| 招待一覧 (`GET /api/boards/{boardId}/invites`) | 対象ボードの `owner` | 未ログイン `401`、`owner` 以外 `403`、閲覧不可 `404` |
| 招待作成 (`POST /api/boards/{boardId}/invites`) | 対象ボードの `owner` | 未ログイン `401`、`owner` 以外 `403`、閲覧不可 `404` |
| 招待再送 (`POST /api/boards/{boardId}/invites/{id}/resend`) | 対象ボードの `owner` | 未ログイン `401`、`owner` 以外 `403`、閲覧不可 `404` |
| 招待失効 (`POST /api/boards/{boardId}/invites/{id}/revoke`) | 対象ボードの `owner` | 未ログイン `401`、`owner` 以外 `403`、閲覧不可 `404` |
| 招待閲覧 (`GET /api/invites/{token}`) | 認証不要 | 存在しない `token` `404` |
| 招待承認 (`POST /api/invites/{token}/accept`) | ログイン済み | 未ログイン `401`、失効 / 期限切れ / 使用済み `410`、既にメンバー `409` |

- 招待作成時に `role = owner` を指定できない (`§ 異常系 § バリデーションエラー`)。承認経由での owner 追加は本 spec 対象外。
- 招待閲覧のみ認証不要とする (URL を知っている = 権利あり)。承認は必ずログインが必要。

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。本 spec 固有の要件は次の通り。

### 性能

- 招待一覧 API は一覧 API として P95 200ms 以内。
- 招待作成 / 再送 / 失効 / 承認 API は書き込み API として P95 300ms 以内。

### セキュリティ (招待 token)

- 招待の `token` は URL-safe な 32 byte 相当のランダム文字列 (base64url or crypto safe な生成方式)。詳細は `design/012_member_invite.md`。
- DB に保存する `token` はハッシュ化した値とし、平文はメール送信 / API レスポンスで 1 度だけ返す。以降の API で平文 `token` は取得できない。
- 招待閲覧 API のレスポンスに `token` の平文を含めない (`token` は URL パスパラメータで参照される)。
- 承認 API は `token` の hash 値で DB を検索する。DB に平文 `token` は保存しない。
- 招待 URL の形式は `/invites/{token}` とし、`token` を query string に置かない (Referer 経由の漏洩防止)。
- 招待 API の全レスポンスに `Cache-Control: no-store` を付ける (`token` のキャッシュ防止)。

### 運用 (操作ログ)

- 招待の作成 / 再送 / 失効 / 承認について、操作種別 (`invite.create` / `invite.resend` / `invite.revoke` / `invite.accept`)、対象識別子 (`inviteId`)、対象ボード (`boardId`)、招待メール (`email`)、ロール (`role`)、操作ユーザー識別子 (`actorId`)、タイムスタンプを操作ログに残す。
- 承認 API のログには承認ユーザー ID (`actorId`) と招待作成者 ID (`invitedBy`) を分けて記録する。
- `token` の平文 / hash 値ともに操作ログに記録しない。ログに残すのは `inviteId` のみ。
- エラーレスポンスを返した場合、ステータス、エラーコード、`inviteId` (取得できる場合)、操作ユーザー識別子をログに記録する。

## 使用する用語

以下の用語は `constitution.md § 用語集` を参照する。

- ボード (Board)

本 spec 固有の用語。

| 用語 | 英訳 | 定義 |
|---|---|---|
| 招待 | Invite | ボードに他ユーザーを追加するための一時的な許可情報。`pending` / `accepted` / `revoked` の 3 状態を持つ。 |
| 招待トークン | Invite Token | 招待 URL に含まれる URL-safe な秘密文字列。DB にはハッシュ化して保存する。 |
| 承認 | Accept | 招待リンクを受け取ったログインユーザーが `BoardMembership` を確立する操作。 |
| 失効 | Revoke | `owner` が `pending` 招待を無効化する操作。 |
| 再送 | Resend | `owner` が既存 `pending` 招待の `token` と `expiresAt` を作り直す操作。 |

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/011_auth.md`
- `spec/013_permissions.md`
- `inputs/011_013_auth_invite_permissions_spec_input.md`

## 未決事項

- メール送信 (招待 URL を対象 `email` にメール配信) は本 spec の対象外。UI 側で招待 URL を表示 / コピー可能にする経路のみを扱う。
- 招待メール文面のカスタマイズ (件名、本文、多言語) は本 spec の対象外。
- 招待承認時に「承認ユーザーの email と招待の email の一致確認」 を強制するかは本 spec で「一致不要」 に固定する (`§ FR-03`)。将来一致確認を追加する場合は別 spec で扱う。
- 招待 URL の QR コード / short link は本 spec の対象外。
- 招待の期限延長 (`resend` 以外の経路) は本 spec の対象外。`resend` で新 token + 新 `expiresAt` を発行する経路のみ提供する。
- 承認ユーザーが既に対象ボードの `owner` である場合の挙動は「他ロールと同じく `409 already_member`」 に固定する (`§ FR-03`)。
- `Invite.token` のハッシュ方式 (SHA-256 vs bcrypt) と `token` の生成方式 (byte 数 / エンコード) は設計工程 (`design/012_member_invite.md`) で決める。

## 作成または更新したファイル

- `spec/012_member_invite.md` (新規作成)
