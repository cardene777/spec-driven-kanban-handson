# カード詳細の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/003_cards.md`
- `spec/004_card_movement_archive_restore.md`
- `spec/005_card_detail.md`

## 前提

Prisma 全体スキーマ、 認証・認可の共通ユーティリティ (`getCurrentUser` / `assertBoardAccess`)、 エラーレスポンスヘルパ、 監査ログ形式、 バリデーション方針 (zod) は `design/001_boards.md § 共通設計方針` を参照する。 Card エンティティの基本と `resolveBoardFromCard(cardId)` は `design/003_cards.md § データモデル` を参照する。 カード詳細モーダルの URL 紐付け (`?card={cardId}`) は `design/003_cards.md § UI 構造` を参照する。 本 file はカード詳細モーダルの拡張 (担当者 / コメント) 固有の設計のみ記述する。

## データモデル

### Card モデルへの拡張

`design/003_cards.md § データモデル` の `Card` に `assigneeId` を追加する。 期限 (`dueDate`) は `design/007_due_date.md` で追加、 ラベル関連は `design/006_label.md` で追加する。

```prisma
model Card {
  id          String   @id @default(cuid())
  listId      String
  title       String
  description String   @default("")
  order       Int
  assigneeId  String?  // 追加。 null = 未割当
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  assignee    User?    @relation("CardAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  comments    Comment[]

  @@unique([listId, order])
  @@index([listId])
  @@index([assigneeId])
}
```

- `assigneeId` は `String?`、 対象ボードの `viewer` 以上のメンバーのみアプリ層で許可する (DB 制約は「User の存在」 のみ)。
- `onDelete: SetNull` により、 User が削除されたら `assigneeId` は自動的に null に戻る。
- ボードから外れる (BoardMembership 削除) 場合の自動クリーンアップは行わない (`spec/005_card_detail.md § 画面レベル` の「保持したまま表示切替」 に一致)。

### Comment モデル (新設)

```prisma
model Comment {
  id        String   @id @default(cuid())
  cardId    String
  authorId  String
  body      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  author    User     @relation("CommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([cardId])
  @@index([authorId])
}
```

- `body` はアプリ層でトリム済み 1〜2000 文字を保証。 空文字は不可 (`spec/005_card_detail.md § バリデーション`)。
- `onDelete: Cascade` により Card 削除 / User 削除で Comment も物理削除される。
- Comment は soft delete しない (`spec/005_card_detail.md § 操作: コメント削除`)。

### User モデル拡張 (relation)

`design/001_boards.md § データモデル` の `User` に relation を追加する。

```prisma
model User {
  id            String            @id @default(cuid())
  name          String
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  memberships   BoardMembership[]
  assignedCards Card[]            @relation("CardAssignee")
  comments      Comment[]         @relation("CommentAuthor")
}
```

### 補助クエリ

- `resolveBoardFromComment(commentId)` = `prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true, cardId: true, card: { select: { listId: true, list: { select: { boardId: true } } } } } })` を `lib/auth/commentAccess.ts` に配置する。
- 未存在は `NotFoundError` を throw する。

### JSON 表現

Card レスポンスへの追加。

```json
{
  "id": "clx...",
  "listId": "clx...",
  "title": "buy milk",
  "description": "2 本",
  "order": 0,
  "assigneeId": "usr_abc",
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

Comment レスポンス。

```json
{
  "id": "cmt_abc",
  "cardId": "clx...",
  "authorId": "usr_abc",
  "body": "実装しました",
  "createdAt": "2026-07-12T10:00:00.000Z",
  "updatedAt": "2026-07-12T10:00:00.000Z"
}
```

## API 設計

`spec/005_card_detail.md § API` の 4 endpoint を Route Handler で実装する。 file 配置。

- `app/api/cards/[cardId]/assignee/route.ts` … `PATCH`
- `app/api/cards/[cardId]/comments/route.ts` … `GET` / `POST`
- `app/api/comments/[commentId]/route.ts` … `DELETE`

### `PATCH /api/cards/{cardId}/assignee` 担当者更新

- 入力 = パスパラメータ `cardId`、 body = `{ assigneeId: string | null }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション。
  - `assigneeId` が指定されている場合、 文字列または `null`。 型不一致は `422 { assigneeId: "invalid_type" }`。
  - `assigneeId` フィールド自体が未指定 (body 空) は `422 { _: "required" }`。
- 処理 (1 トランザクション)。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "member")`。
  3. body を zod 検証。
  4. `assigneeId` が文字列の場合、 以下を追加検証。
     - `user = prisma.user.findUnique({ where: { id: assigneeId } })`、 未存在なら `422 { assigneeId: "assignee_not_found" }`。
     - `getBoardRole(assigneeId, boardId)` が `null` (未参加) なら `422 { assigneeId: "assignee_not_in_board" }`。
  5. `prisma.card.update({ where: { id: cardId }, data: { assigneeId } })`。
- 出力 = `200 Card` (更新後)。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=card.assignee.update`、 `context={ cardId, boardId, oldAssigneeId, newAssigneeId }`。

### `GET /api/cards/{cardId}/comments` 一覧取得

- 入力 = パスパラメータ `cardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "viewer")`。
  3. `prisma.comment.findMany({ where: { cardId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })`。
- 出力 = `200 { items: Comment[] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=comment.list`、 `context={ cardId, boardId, count }`。

### `POST /api/cards/{cardId}/comments` 投稿

- 入力 = パスパラメータ `cardId`、 body = `{ body: string }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション。
  - `body` は文字列、 トリム後 1〜2000 文字。 違反時 `422 { body: "required" | "too_long" | "invalid_type" }`。
  - トリム後 0 文字は `required` として扱う。 保存時は「原文のまま」 (トリム前) を保存する (`spec/005_card_detail.md § 境界条件`)。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "member")`。
  3. body を zod 検証。
  4. `prisma.comment.create({ data: { cardId, authorId: userId, body } })`。
  5. Card の `updatedAt` は更新しない (`spec/005_card_detail.md § 操作: コメント投稿`)。
- 出力 = `201 Comment`。
- ステータス = `201` / `401` / `403` / `404` / `422`。
- ログ = `event=comment.create`、 `targetId=新規 commentId`、 `context={ cardId, boardId }`。

### `DELETE /api/comments/{commentId}` 削除

- 入力 = パスパラメータ `commentId`。
- 権限 = 投稿者本人 (`member` 以上) または対象ボードの `owner`。
- 処理。
  1. `comment = resolveBoardFromComment(commentId)`、 未存在なら `404`。
  2. `boardId = comment.card.list.boardId`。
  3. `assertBoardAccess(userId, boardId, "viewer")` (閲覧不可なら `404`)。
  4. 削除権限判定。
     - `userId === comment.authorId` かつ `role >= member` なら許可。
     - `role === "owner"` なら許可 (投稿者を問わず)。
     - それ以外は `ForbiddenError` を throw して `403`。
  5. `prisma.comment.delete({ where: { id: commentId } })`。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=comment.delete`、 `targetId=commentId`、 `context={ cardId, boardId, authorId }`。

### 既存 Card API との連携

- `GET /api/cards/{cardId}` および `GET /api/lists/{listId}/cards` のレスポンスに `assigneeId` を含める (`design/003_cards.md § Card リソース JSON 表現` を本 file で拡張)。 期限 (`dueDate`) は `design/007_due_date.md` で追加する。
- `PATCH /api/cards/{cardId}` (title / description 更新) の zod schema には `assigneeId` を含めない (専用 endpoint に分離する方針)。

## UI 構造

### 配置

- `design/003_cards.md § UI 構造` の `CardDetailModal` を拡張し、 6 領域を配置する。
- 各領域は独立した Client Component として実装し、 領域ごとに fetch / mutation state を持つ (1 領域の失敗が他領域に波及しない)。

### 主要 Client Component (追加分)

| コンポーネント | 責務 |
|---|---|
| `CardDetailModal` | 詳細モーダル本体 (`design/003_cards.md` から継承)。 6 領域のレイアウトのみ担当。 |
| `CardAssigneeField` | 担当者領域。 現在の担当者表示、 選択 UI、 解除導線。 `PATCH /api/cards/{cardId}/assignee` を叩く。 |
| `CardCommentsList` | コメント一覧。 `GET /api/cards/{cardId}/comments` を叩き `createdAt` 昇順で描画。 |
| `CardCommentForm` | 新規投稿 form。 `POST /api/cards/{cardId}/comments` を叩く。 |
| `CardCommentRow` | 1 コメント行。 投稿者名、 `createdAt`、 本文、 削除導線を表示 (削除可能な場合のみ)。 |
| `CardCommentDeleteConfirm` | 削除確認 (`window.confirm` で初期実装)。 |

### 領域内の状態

- 担当者領域 = `idle → editing (候補選択中) → submitting → success | error`。 error 時は前状態に戻す。
- コメント一覧 = `idle → loading → success (items=[] なら empty) | error`。 投稿 / 削除で楽観的追加 / 削除 → API 応答で確定。
- 各領域の 4xx / 5xx はその領域内に inline error を出し、 モーダル全体は開いたままにする。

### 担当者候補の取得

- 担当者候補は `GET /api/boards/{boardId}/members` を新設して取得する経路が理想だが、 `spec/005_card_detail.md § 未決事項` により本 spec 外。 初期実装ではボード詳細画面が持つ `members: User[]` (サーバー側で prisma から取得) を Context 経由で `CardAssigneeField` に渡す。
- 担当者候補は「対象ボードの `viewer` 以上のメンバー全員」 とする (`spec/005_card_detail.md § 操作: 担当者の割当`)。

### 空状態

- 担当者領域: 未割当時は「未割当」 のプレースホルダ表示 (文言 / スタイルは `ui-design/`)。
- コメント領域: 0 件時は「まだコメントはありません」 相当の空状態。

## 状態遷移

### エンティティ状態

Card (担当者フィールド)。

```
[assigneeId=null]  --PATCH assignee (userId)-->  [assigneeId=userId]
[assigneeId=X]     --PATCH assignee (userId)-->  [assigneeId=userId] (上書き)
[assigneeId=X]     --PATCH assignee (null)-->    [assigneeId=null]
[assigneeId=X]     --User X 物理削除-->          [assigneeId=null] (onDelete: SetNull)
[Card 削除]        --Cascade-->                   (Card 消失)
```

Comment。

```
[存在せず]  --POST-->                                 [存在]
[存在]      --DELETE (投稿者本人 or owner)-->        [存在せず (物理削除)]
[Card 削除] --Cascade-->                             [存在せず]
[User 削除] --Cascade-->                             [存在せず (authorId 経由)]
```

### UI 状態遷移 (モーダル 6 領域)

```
モーダル open → 領域単位で並行に fetch (title/description は既存、 comments / labels / due-date は追加 fetch)
各領域 = idle → editing → submitting → success | error(inline) → 元の状態
モーダル閉じで各領域の state 破棄 (次回開くとき再 fetch)
```

## 非機能の実装方針

### 性能

- 担当者更新 / コメント投稿 / コメント削除 = 単一 update / create / delete のみ。 P95 300ms 以内は SQLite で余裕。
- コメント一覧 = `@@index([cardId])` 経由の絞り込み + `orderBy: createdAt` で P95 200ms 以内。 初期実装は全件返却 (`spec/005_card_detail.md § 未決事項` のページネーション非対応)。
- 担当者候補の取得はサーバーコンポーネント側で 1 回のみ (ボード詳細ページ描画時)、 モーダル開閉毎に再取得しない。

### セキュリティ

- 担当者更新の `assigneeId` 検証で「対象ボードの `viewer` 以上」 を要件とする (`spec/005_card_detail.md § 境界条件`)。 対象ボードに属さない User を指定した場合は `422 assignee_not_in_board` を返し、 存在の有無を露出しない (User 存在チェックは先に行い、 未存在は `422 assignee_not_found` に集約する)。
- コメント削除は「投稿者本人 or owner」 の 2 条件を Route Handler 内で明示チェックする。 `assertBoardAccess` は `viewer` 以上の判定のみに用い、 その後に個別権限判定を挟む。
- コメント body は plain text として保存し、 レンダリング時に XSS 対策としてエスケープする (React の JSX が自動でエスケープするため、 `dangerouslySetInnerHTML` は使わない)。

### 運用

- 担当者更新時は `oldAssigneeId` と `newAssigneeId` を context に残す。
- コメント削除時は投稿者 (`authorId`) と削除者 (`actorId`) を分けて残す (owner による他者コメント削除の追跡)。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `PATCH /api/cards/{cardId}/assignee` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "member")` + `assigneeId` の User 存在検証 + `getBoardRole(assigneeId, boardId) !== null` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403`、 assignee 検証失敗 `422` |
| `GET /api/cards/{cardId}/comments` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "viewer")` | 未認証 `401`、 未存在 / 閲覧不可 `404` |
| `POST /api/cards/{cardId}/comments` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "member")` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403` |
| `DELETE /api/comments/{commentId}` | `resolveBoardFromComment` → `assertBoardAccess(userId, boardId, "viewer")` (閲覧不可 `404`) → 「投稿者本人 or `owner`」 判定 | 未認証 `401`、 未存在 / 閲覧不可 `404`、 それ以外は `403` |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `card.assignee.update` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ boardId, oldAssigneeId, newAssigneeId }`、 `status=200` |
| `comment.list` 成功 | `info` | `actorId`、 `context={ cardId, boardId, count }`、 `status=200` |
| `comment.create` 成功 | `info` | `actorId`、 `targetId=新規 commentId`、 `context={ cardId, boardId }`、 `status=201` |
| `comment.delete` 成功 | `info` | `actorId`、 `targetId=commentId`、 `context={ cardId, boardId, authorId }`、 `status=204` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成 (Board / List / Card 設計と共通)

- 単体テスト … zod スキーマ (`assigneeId` / `body`)、 コメント削除権限判定 pure 関数 (`lib/auth/canDeleteComment.ts`)。
- Route Handler テスト … 独立 SQLite テスト DB。 `getCurrentUser` 差し替え。 3 ロール × 2 (投稿者本人 / 他者投稿) の削除権限マトリクスを網羅する。
- UI テスト … `CardDetailModal` の 6 領域独立性、 コメント楽観的追加 / 削除の rollback (優先度中)。

### ケース一覧

| 種別 | ケース例 |
|---|---|
| 正常系 (担当者) | `null → user`、 `user → user2` (上書き)、 `user → null` (解除)、 自分自身にアサイン、 `viewer` を担当者に指定 (成功) |
| 正常系 (コメント) | 一覧取得 (0 件 / 複数件、 `createdAt` 昇順、 同時刻の `id` 昇順)、 投稿、 投稿者本人による削除、 owner による他者投稿削除 |
| 権限 (担当者) | `viewer` で `PATCH assignee` = `403`、 未参加 = `404` |
| 権限 (コメント) | `viewer` で `POST` = `403`、 `member` で他者コメント削除 = `403`、 `viewer` で自コメント削除 = `403` (viewer は投稿不可のため事前条件成立しない)、 未参加で `GET` = `404` |
| 未存在 | 存在しない `cardId` で担当者更新 / コメント一覧 / 投稿 = `404`。 存在しない `commentId` で削除 = `404` |
| バリデーション (担当者) | `assigneeId` 型不一致 = `422 invalid_type`。 存在しない User = `422 assignee_not_found`。 別ボードの User = `422 assignee_not_in_board`。 body 空 = `422 required` |
| バリデーション (コメント) | `body` 空 / トリム後 0 / 2001 文字 = `422`。 `body` 型不一致 = `422 invalid_type` |
| 境界 | `body` = 1 / 2000 文字で成功、 2001 文字で `422`。 body 中の空白 (先頭 / 末尾 / 連続) を原文のまま保存 |
| カスケード | Card 削除で配下 Comment が全消え、 Comment の `GET` は `404`。 User 削除で `assigneeId` が null になる、 その User の投稿 Comment が全消え |
| モーダル領域独立 | 担当者領域の 422 応答時、 コメント領域は影響を受けない |

### 補助ヘルパ

- `tests/helpers/factories.ts` に `createComment(card, author, {body?, createdAt?})` を追加する。
- `tests/helpers/roles.ts` に「作成した User に対して指定 Board の指定 role でメンバーシップを付与」 する helper を用意し、 担当者検証テストで再利用する。

## 実装方針 (本設計で固定する判断)

- 担当者を専用 endpoint (`PATCH /api/cards/{cardId}/assignee`) に分離する。 既存 `PATCH /api/cards/{cardId}` の schema には含めない。 理由 = 担当者更新は「User 存在検証」 + 「ボード所属検証」 が必要で、 title / description 更新とバリデーション経路が異なるため、 分離した方が Route Handler の責務が単純になる。
- 担当者は 1 人まで固定 (`spec/005_card_detail.md § 対象データ`)。 将来の複数割当は中間テーブル (`CardAssignee`) 化で対応する余地を残すが、 本設計では `Card.assigneeId` の単一 field 方式を採用する。
- コメントは物理削除方式を採用 (`spec/005_card_detail.md § 操作: コメント削除`)。 復元 / 履歴保持は行わない。
- コメント編集は本 spec 外のため endpoint 実装しない。 `Comment.updatedAt` は Prisma の `@updatedAt` により自動更新されるが、 実質使われない。 将来編集対応時に活用する。
- コメント削除権限判定 (「投稿者本人 or owner」) は `assertBoardAccess` の外に独立関数として置く。 `lib/auth/canDeleteComment.ts` に切り出し、 pure 関数として単体テストする。
- 担当者候補一覧の API は本 spec 外。 初期実装はサーバーコンポーネント側で `BoardMembership` から取得したメンバー一覧を Context で `CardAssigneeField` に渡す経路とする。

## 実装順序

1. **`design/001_boards.md` / `design/002_lists.md` / `design/003_cards.md` の実装順序を先に完了させる**
   Board / List / Card の基本 CRUD と認証共通部品が本設計の前提。
2. **Prisma スキーマ拡張と migration**
   `Card.assigneeId` 追加 (`String?` + relation `CardAssignee`) と `Comment` モデル新設を 1 つの migration で流す。 既存の `@@unique` / `@@index` を破壊しないことを確認する。
   依存 = 手順 1。
3. **共通ユーティリティ**
   - `lib/auth/commentAccess.ts` の `resolveBoardFromComment(commentId)`。
   - `lib/auth/canDeleteComment.ts` の pure 関数 (`{ userId, comment, boardRole }` → boolean)。
   - zod スキーマ (`schemas/assignee.ts` / `schemas/comment.ts`)。
   依存 = 手順 2。
4. **API endpoint 4 本**
   `PATCH /api/cards/{cardId}/assignee` → `POST /api/cards/{cardId}/comments` → `GET /api/cards/{cardId}/comments` → `DELETE /api/comments/{commentId}` の順で実装する。 担当者更新を先に置くのは、 コメント関連より依存が浅く単体で動作確認できるため。
   依存 = 手順 3。
5. **既存 Card レスポンスへの `assigneeId` 追加**
   `GET /api/cards/{cardId}` / `GET /api/lists/{listId}/cards` のレスポンスに `assigneeId` を含める。 既存テストが `assigneeId` 未定義を assert しているなら修正する。
   依存 = 手順 4。
6. **UI コンポーネント**
   `CardDetailModal` を 6 領域構造に拡張 → `CardAssigneeField` (担当者候補は Context 経由で受ける) → `CardCommentsList` + `CardCommentForm` + `CardCommentRow` + 削除確認の順で組み込む。 ラベル領域 / 期限領域は空プレースホルダで置き、 `design/006_label.md` / `design/007_due_date.md` の実装で差し替える。
   依存 = 手順 5。
7. **テスト整備**
   pure 単体テスト (手順 3) → Route Handler テスト (手順 4、 担当者検証と削除権限マトリクス網羅を含む) → UI テスト (領域独立性、 楽観的追加 / 削除) の順で追加する。
   依存 = 手順 3〜6。
