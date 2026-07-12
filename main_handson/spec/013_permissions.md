# 権限管理機能の仕様

## 概要

本 file はボード (Board) に対するメンバーの権限管理 (Permissions) 機能の仕様を定義する。
対象操作はメンバー一覧取得、ロール変更、メンバー削除 (自身の脱退を含む) の 3 種類とする。
共通ルールは `spec/000_shared_rules.md`、ボード基本仕様は `spec/001_boards.md`、認証機構は `spec/011_auth.md`、招待機構は `spec/012_member_invite.md` を参照する。
`constitution.md § 権限ポリシー` の 3 ロール (`owner` / `member` / `viewer`) の運用ルールを、本 spec が SSOT として定義する。

## 既存仕様との関係

- `spec/000_shared_rules.md § 未決事項` の「ボードに対するメンバー招待と権限変更の UI と API は別 spec で決める」 のうち、招待経路は `spec/012_member_invite.md`、権限変更 / 一覧 / 脱退経路を本 spec が引き受ける。
- `constitution.md § 権限ポリシー § ロール` の 3 ロール定義と、`§ 操作と必要権限` の operation → role マトリクスは本 spec の前提。本 spec で新しい operation を追加せず、既存 3 ロールの管理経路を定義する。
- 既存の Board / List / Card / Comment / Assignee 系 API が参照する `assertBoardAccess` / `getBoardRole` (`design/001_boards.md`) の判定入力を本 spec が変更させる。ロール変更 / メンバー削除で `BoardMembership` を書き換えると、以降の API 呼出は新ロールで判定される (即時反映)。

## 対象データ

### BoardMembership エンティティ (既存)

既存フィールドは `design/001_boards.md § データモデル > Prisma スキーマ` を参照。

| フィールド | 型 | 説明 |
|---|---|---|
| `boardId` | 文字列 | ボード ID (複合主キー) |
| `userId` | 文字列 | ユーザー ID (複合主キー) |
| `role` | `owner` / `member` / `viewer` | ロール |
| `createdAt` | ISO8601 UTC | 参加日時 |

- 複合主キー `(boardId, userId)` により 1 ユーザー = 1 ボードあたり 1 ロール。
- 本 spec では `BoardMembership` の物理削除 (脱退 / owner による強制削除) と `role` 更新のみを扱う。
- 招待経由の追加は `spec/012_member_invite.md § FR-03` の承認 API で行う (本 spec は追加経路を持たない)。

## 機能要件

### FR-01: メンバー一覧取得

- ボード詳細画面のメンバー管理領域から、対象ボードの `owner` / `member` / `viewer` 全員を表示する。
- 一覧はロール順 (`owner` → `member` → `viewer`) を第一キー、`createdAt` 昇順を第二キー、`userId` 昇順を第三キーで返す。
- 各行に `userId` / `name` / `email` / `role` / `createdAt` を含める。

観測可能な完了条件

- [ ] `GET /api/boards/{boardId}/members` に `viewer` 以上のユーザーがアクセスすると `200` と `{ items: BoardMember[] }` が返る。
- [ ] レスポンスの `items` はロール順 (`owner` → `member` → `viewer`) → `createdAt` 昇順 → `userId` 昇順で並ぶ。
- [ ] `items` の各要素は `{ userId, name, email, role, createdAt }` を含む。

### FR-02: ロール変更

- ボード詳細画面のメンバー管理領域から `owner` が実行する。
- 入力項目は `role` (対象ユーザーの新ロール)、対象は URL パスの `userId`。
- ロールは `owner` / `member` / `viewer` の 3 値のみ受け付ける。
- `§ FR-04` の「最後の `owner` 降格禁止」 制約を満たさない場合は `422` を返す。

観測可能な完了条件

- [ ] `owner` が `PATCH /api/boards/{boardId}/members/{userId}` に `{ role: "member" }` を送ると `200` と更新後の `BoardMember` オブジェクトが返る。
- [ ] 変更後、対象ユーザーの以降の API 呼出は新ロールで判定される (即時反映)。
- [ ] `role` = `owner` / `member` / `viewer` のいずれも受け付ける。
- [ ] `role` が上記 3 値以外なら `422` (`role`, `invalid_value`) が返る。
- [ ] `owner` 以外がロール変更 API を呼ぶと `403` が返る。

### FR-03: メンバー削除 (owner による強制削除、または自身の脱退)

- `owner` が他メンバーの `BoardMembership` を物理削除する。
- `member` / `viewer` は自身の `BoardMembership` のみ削除できる (脱退)。
- 削除操作は明示的な確認 (確認ダイアログ等) を伴う。UI 詳細は `ui-design/` で決める。
- `owner` による自身の脱退は `§ FR-04` の「最後の `owner`」 制約に従う。

観測可能な完了条件

- [ ] `owner` が `DELETE /api/boards/{boardId}/members/{userId}` を他ユーザーに対して呼ぶと `204` が返り、`BoardMembership` が削除される。
- [ ] `member` が自身の `userId` に対して呼ぶと `204` が返り、`BoardMembership` が削除される。
- [ ] `member` が他ユーザーに対して呼ぶと `403` が返る。
- [ ] 削除後、対象ユーザーは対象ボード配下の API を呼ぶと `404` が返る (閲覧不可)。

### FR-04: 最後の owner 降格 / 削除の禁止

- 対象ボードに `owner` ロールが 1 名のみ (`owner` 総数 = 1) の状態で、その `owner` を対象とする以下 2 操作を禁止する。
  - ロール変更 (`role` を `member` / `viewer` に降格)
  - メンバー削除 (owner による強制削除 / 自身の脱退の両方)
- 禁止操作は `422` (`role` or `userId`, `last_owner`) を返す。
- `owner` を 2 名以上に増やしてから片方を降格 / 削除する経路のみ許可する。
- 本制約は「ボード削除」 経路 (`DELETE /api/boards/{boardId}`、`spec/001_boards.md`) には適用しない (ボード削除でメンバーシップは全消滅する)。

観測可能な完了条件

- [ ] `owner` 1 名のボードで、その `owner` に対して `PATCH ... { role: "member" }` を呼ぶと `422` (`role`, `last_owner`) が返る。
- [ ] `owner` 1 名のボードで、その `owner` に対して `DELETE ...` を呼ぶ (自身の脱退) と `422` (`userId`, `last_owner`) が返る。
- [ ] `owner` 2 名のボードで片方を `member` に降格すると `200` が返り、その後残った 1 名を降格すると `422` が返る。
- [ ] `owner` 1 名のボードで、他の `member` / `viewer` は自由に脱退 (`204`) できる。

### FR-05: viewer の閲覧専用制約

- `viewer` ロールはボード / リスト / カード / コメントの閲覧のみ可能。作成 / 更新 / 削除 / 移動 / 招待の全ての書き込み操作は `403` を返す。
- 本 spec ではこの原則を再定義し、既存 Board / List / Card / Comment / Assignee 系 API の判定は既存 `assertBoardAccess` を継承する (書き換えなし)。

観測可能な完了条件

- [ ] `viewer` が `GET /api/boards/{boardId}` / `GET /api/lists/{listId}/cards` / `GET /api/cards/{cardId}/comments` を呼ぶと `200` が返る。
- [ ] `viewer` が `POST /api/lists` / `POST /api/cards` / `PATCH ...` / `DELETE ...` を呼ぶと `403` が返る。
- [ ] `viewer` が招待作成 / メンバー削除 / ロール変更 API を呼ぶと `403` が返る。
- [ ] `viewer` が本 spec の `GET /api/boards/{boardId}/members` を呼ぶと `200` が返る (閲覧は許可)。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `GET` | `/api/boards/{boardId}/members` | 対象ボードのメンバー一覧 | 対象ボードの `viewer` 以上 |
| `PATCH` | `/api/boards/{boardId}/members/{userId}` | メンバーのロール変更 | 対象ボードの `owner` |
| `DELETE` | `/api/boards/{boardId}/members/{userId}` | メンバー削除 (owner による強制削除、または本人による脱退) | 対象ボードの `owner` または本人 |

- レスポンス形式と認証チェック順序は `spec/000_shared_rules.md` に従う。
- 一覧 API のレスポンスは `{ items: BoardMember[] }`、`BoardMember = { userId, name, email, role, createdAt }`。
- ロール変更 API のリクエスト body は `{ "role": "owner" | "member" | "viewer" }`、レスポンスは更新後の `BoardMember` オブジェクト。
- 削除 API はリクエスト body なし、成功時 `204` (body なし)。

## 受入条件

FR ごとの完了条件は `§ 機能要件` の各 FR に記載する。以下は FR を横断する統合条件。

- [ ] `viewer` 以上のメンバーが `GET /api/boards/{boardId}/members` を呼ぶと `200` が返る。
- [ ] メンバーでないユーザーが `GET /api/boards/{boardId}/members` を呼ぶと `404` が返る (存在露出防止)。
- [ ] 未ログインで本 spec のいずれの API を呼んでも `401` が返る。
- [ ] 存在しない `boardId` を指定すると `404` が返る。
- [ ] 存在しない `userId` (対象ボードのメンバーでない) をロール変更 / 削除で指定すると `404` が返る。
- [ ] `owner` が他ユーザーのロールを `owner` に昇格すると `200` が返り、以降そのユーザーは owner 権限で操作できる。
- [ ] `owner` が他ユーザーのロールを `member` / `viewer` に変更すると `200` が返り、以降そのユーザーは新ロールで判定される。
- [ ] `owner` が自身のロールを変更しようとする時、`owner` が 2 名以上いれば成功、1 名なら `422` (`role`, `last_owner`) が返る。
- [ ] `owner` が自身を削除しようとする時、`owner` が 2 名以上いれば `204`、1 名なら `422` (`userId`, `last_owner`) が返る。
- [ ] `member` / `viewer` が他ユーザーの削除を実行すると `403` が返る。
- [ ] `member` / `viewer` が自身の削除 (脱退) を実行すると `204` が返る。
- [ ] `viewer` が本 spec の `PATCH` / `DELETE` (他ユーザー対象) を呼ぶと `403` が返る。
- [ ] ロール変更 / メンバー削除に成功すると、操作ログに `event` / `actorId` / `boardId` / `targetUserId` / `oldRole` / `newRole` (削除時は `newRole = null`) が記録される。
- [ ] ロール変更や削除で最後の owner 制約に該当する場合、DB は変更されず `422` のみ返る。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコード` の 4 種 (401 / 403 / 404 / 422) を用いる。本 spec で追加のステータスコードは用いない。

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで本 spec の API 呼出 | `401` | 全 API 共通 |
| 存在しない `boardId` を指定 | `404` | 全 API 共通 |
| 対象ボードに所属しないユーザーが `GET` を呼ぶ | `404` | 存在露出防止 |
| 存在しない `userId` を `PATCH` / `DELETE` の path に指定 | `404` | 対象ボードにメンバーとして存在しない |
| `viewer` / `member` が `PATCH` を呼ぶ | `403` | 認証済み、閲覧可の状態が前提 |
| `member` / `viewer` が他ユーザー対象の `DELETE` を呼ぶ | `403` | 自身の脱退のみ許可 |
| `owner` 以外が他ユーザーの `DELETE` を呼ぶ | `403` | `owner` のみ強制削除可 |

### バリデーションエラー

| 状況 | ステータス | フィールド | メッセージ例 |
|---|---|---|---|
| `role` 未指定 (PATCH body 空) | `422` | `role` | `required` |
| `role` が文字列型でない | `422` | `role` | `invalid_type` |
| `role` が `owner` / `member` / `viewer` 以外 | `422` | `role` | `invalid_value` |
| 最後の `owner` を `member` / `viewer` に降格 | `422` | `role` | `last_owner` |
| 最後の `owner` を削除 (他 owner 経由 / 自身脱退の両方) | `422` | `userId` | `last_owner` |

### 画面レベル

- メンバー一覧画面で API が `403` を返した場合、「メンバー管理は owner のみが操作できます」 相当の表示を行う (`owner` 以外は本画面領域を非表示にする経路を推奨、UI 詳細は `ui-design/`)。
- ロール変更 / 削除 UI が `422 last_owner` を返した場合、「最後の owner は降格 / 削除できません。先に別の owner を追加してください」 相当のメッセージを表示する。
- 削除 UI が `403` を返した場合、「自身以外の脱退はできません」 相当の表示を行う。
- 一覧 UI で `404` を検出した場合 (ボード削除等)、ボード一覧画面 (`/`) にリダイレクトする。

## 境界条件

### owner 総数

- `owner` 1 名 (下限): その `owner` は降格不可 / 削除不可 (`§ FR-04`)。他ロール (`member` / `viewer`) は自由に脱退可能。
- `owner` 2 名: 片方を降格 / 削除しても、もう片方が残るため許可される。降格後・削除後の owner 総数が 1 名になる状態は許容 (`§ FR-04` の禁止は「操作の結果、owner 総数が 0 になる」 場合のみ)。
- `owner` 3 名以上: 2 名まで降格可能。

### ロール変更の遷移

- `member` → `owner`: 許可。`owner` 総数が 1 → 2 に増える (`§ FR-04` 制約なし)。
- `viewer` → `owner`: 許可。
- `viewer` → `member`: 許可。
- `owner` → `member` / `viewer`: `§ FR-04` 制約下でのみ許可 (owner 総数が 2 以上の場合)。
- 同ロールへの変更 (`owner` → `owner` 等): 受け付けて `200` を返す (副作用なし、冪等)。

### 削除の対象

- 対象が `owner`: `§ FR-04` 制約下でのみ許可。他 owner が呼び出す、または自身が脱退する経路のみ。
- 対象が `member` / `viewer`: `owner` は自由に削除可能。本人は自身のみ脱退可能。
- 対象が自身: 自己脱退経路 (`§ FR-03`)。`§ FR-04` に該当する場合は不可。

### 存在しないメンバー

- `PATCH` / `DELETE` の `userId` が対象ボードの `BoardMembership` に存在しない: `404`。
- 対象 `userId` が User テーブルにも存在しない: `404` (`BoardMembership` の未存在で判定するため、User 有無は問わない)。

### ロール変更の後方影響 (即時反映)

- ロール変更が成功した直後、対象ユーザーの以降の API 呼出は新ロールで判定される (認証 middleware は毎回 DB を引く、`design/013_permissions.md`)。
- キャッシュ経路は本 spec の対象外 (即時反映のため無キャッシュ方針)。

## バリデーション

| フィールド | ルール |
|---|---|
| `boardId` (URL) | 文字列。存在しないと `404`。 |
| `userId` (URL) | 文字列。対象ボードの `BoardMembership` に存在しないと `404`。 |
| `role` (PATCH body) | 文字列。`owner` / `member` / `viewer` のみ受け付ける。それ以外は `invalid_value`。空文字 / null / 未指定は `required`。 |

- `PATCH` API では `boardId` / `userId` / `createdAt` はクライアントから受け取らない。
- `DELETE` API は body を受け付けない。
- `GET` API は query parameter を受け付けない (フィルタ、ページネーションは対象外)。

## 権限境界

`spec/000_shared_rules.md § 権限マトリクス` と `constitution.md § 権限ポリシー` を統合した本 spec 対象操作の表。

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| メンバー一覧 (`GET /api/boards/{boardId}/members`) | 対象ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |
| ロール変更 (`PATCH /api/boards/{boardId}/members/{userId}`) | 対象ボードの `owner` | 未ログイン `401`、`owner` 以外 `403`、閲覧不可 `404`、最後の owner 降格 `422` |
| メンバー削除 (`DELETE /api/boards/{boardId}/members/{userId}`) | 対象ボードの `owner` または本人 | 未ログイン `401`、他人削除は `owner` 必須 `403`、閲覧不可 `404`、最後の owner 削除 `422` |

- 削除の権限判定は 2 段構造とする。
  1. `assertBoardAccess(actorId, boardId, "viewer")` で閲覧権限を判定 (閲覧不可は `404`)。
  2. 「(`actor.userId = 対象 userId` かつ 自身の削除)」 or 「actor.role = `owner`」 のいずれかを満たさない場合に `403` を返す。
  3. 上記を満たした上で `§ FR-04` の最後 owner 制約を判定 (満たさない場合 `422`)。
- 自身の削除でも、`owner` かつ owner 総数 1 名の場合は `422 last_owner` を返す (`§ FR-04`)。

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。本 spec 固有の要件は次の通り。

### 性能

- メンバー一覧 API は一覧 API として P95 200ms 以内 (`@@index([userId])` を含む JOIN で解決)。
- ロール変更 / 削除 API は書き込み API として P95 300ms 以内。owner 総数の集計は同一トランザクション内で `count` 1 本のみ (`§ FR-04`)。

### セキュリティ

- ロール変更 / 削除は即時反映する。認証 middleware は毎回 `BoardMembership` を DB から引く方針とし、キャッシュを持たない (`§ 境界条件 § ロール変更の後方影響`)。
- レスポンスに User 個人情報 (`email`) を含めるため、閲覧権限 (`viewer` 以上) の判定を厳格に行う。
- 最後の owner 判定は書き込み API 内の同一トランザクションで実施する (レースコンディション回避、`design/013_permissions.md`)。

### 運用 (操作ログ)

- ロール変更操作について、操作種別 (`member.role_change`)、対象識別子 (`targetUserId`)、対象ボード (`boardId`)、旧ロール (`oldRole`)、新ロール (`newRole`)、操作ユーザー識別子 (`actorId`)、タイムスタンプを操作ログに残す。
- メンバー削除操作について、操作種別 (`member.remove`)、対象識別子 (`targetUserId`)、対象ボード (`boardId`)、削除前ロール (`oldRole`)、操作ユーザー識別子 (`actorId`) を操作ログに残す。owner による強制削除と本人による脱退は同一 event で記録するが、`context` に `selfRemoval: boolean` を含める。
- 最後の owner 降格 / 削除 拒否 (`422 last_owner`) は `warn` レベルでログに残す。owner 保護制約の発火頻度を観測できるようにする。
- エラーレスポンスを返した場合、ステータス、エラーコード、対象 `targetUserId`、操作ユーザー識別子をログに記録する。

## 使用する用語

以下の用語は `constitution.md § 用語集` を参照する。

- ボード (Board)

本 spec 固有の用語。

| 用語 | 英訳 | 定義 |
|---|---|---|
| ロール | Role | ボード内でのユーザーの役割。`owner` / `member` / `viewer` の 3 値。 |
| ロール変更 | Role Change | `owner` が他メンバーの `role` を変更する操作。 |
| 脱退 | Leave | 本人が自身の `BoardMembership` を物理削除する操作。 |
| 最後の owner | Last Owner | 対象ボードに `owner` ロールが 1 名のみの状態で、その `owner` を指す用語。降格 / 削除禁止の対象。 |

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/011_auth.md`
- `spec/012_member_invite.md`
- `inputs/011_013_auth_invite_permissions_spec_input.md`

## 未決事項

- 対象ユーザーの検索 UI (member 一覧が多数の場合のフィルタ) は本 spec の対象外。
- ロール変更 / 削除の通知 (対象ユーザーへのメール / in-app 通知) は本 spec の対象外。
- 監査ログの永続化 (現状は標準出力への 1 行 JSON) は本 spec の対象外。
- ボードの譲渡 (最後の owner が自分の権限を別ユーザーに移し、自身は member に降格) は本 spec の対象外。相当の手順は「別 owner を追加 → 自身の role を降格」 の 2 API 呼出で実現する。
- カスタムロールの追加 (`admin` / `guest` 等) は本 spec の対象外。
- ロール別の操作制限のさらなる細分化 (例 `member` はコメントのみ可 / カード編集不可) は本 spec の対象外。
- 監査ログの `actorId` = `null` になるケース (システム経由の自動処理) は本 spec の対象外。全 API は認証済みユーザーによる操作のみを扱う。

## 作成または更新したファイル

- `spec/013_permissions.md` (新規作成)
