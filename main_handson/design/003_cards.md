# カード機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`

## 前提

Prisma 全体スキーマ、 認証・認可の共通ユーティリティ、 エラーレスポンスヘルパ、 監査ログ形式、 バリデーション方針、 `order` の内部表現、 カスケード削除は `design/001_boards.md § 共通設計方針` を参照する。 リスト側のクライアント DnD コンテキストと `@dnd-kit/core` の採用は `design/002_lists.md § UI 構造` を参照する。 本 file は Card 固有の設計のみ記述する。

## データモデル

### Card (Prisma、 `design/001_boards.md` の schema から再掲)

```prisma
model Card {
  id          String   @id @default(cuid())
  listId      String
  title       String
  description String   @default("")
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, order])
  @@index([listId])
}
```

- `title` は `String`、 アプリ層でトリム済み 1〜200 文字を保証。
- `description` は `String`、 空文字 default、 0〜2000 文字。 トリムしない (`spec/003_cards.md § 境界条件`)。
- `order` は `Int` の 0 起点連番、 同一 `listId` 内で一意 (`@@unique([listId, order])`)。 別ボード / 別リストとの一意性は不要。

### 補助クエリ = `listId → boardId` 解決

- カード系 API は `listId` または `cardId` から出発するが、 権限判定は「所属ボードの role」 に対して行う。
- そのため以下の 2 段解決を `lib/auth/cardAccess.ts` に集約する。
  - `resolveBoardFromList(listId)` = `prisma.list.findUnique({ where: { id: listId }, select: { id: true, boardId: true } })`
  - `resolveBoardFromCard(cardId)` = `prisma.card.findUnique({ where: { id: cardId }, select: { id: true, listId: true, list: { select: { boardId: true } } } })`
- 未存在は `NotFoundError` を throw する。

### Card リソース JSON 表現

```json
{
  "id": "clx...",
  "listId": "clx...",
  "title": "buy milk",
  "description": "2 本",
  "order": 0,
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

## API 設計

`spec/003_cards.md § API` の 6 endpoint を Route Handler で実装する。 file 配置。

- `app/api/lists/[listId]/cards/route.ts` … `GET` / `POST`
- `app/api/cards/[cardId]/route.ts` … `GET` / `PATCH` / `DELETE`
- `app/api/cards/[cardId]/order/route.ts` … `PATCH`

### `GET /api/lists/{listId}/cards` 一覧取得

- 入力 = パスパラメータ `listId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `list = resolveBoardFromList(listId)`。 未存在なら `404`。
  2. `assertBoardAccess(userId, list.boardId, "viewer")`。
  3. `prisma.card.findMany({ where: { listId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] })`。
- 出力 = `200 { items: Card[] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=card.list`、 `context={ listId, boardId, count }`。

### `GET /api/cards/{cardId}` 詳細取得

- 入力 = パスパラメータ `cardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`。 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "viewer")`。
  3. Card を返す。
- 出力 = `200 Card`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=card.get`、 `context={ cardId, boardId }`。

### `POST /api/lists/{listId}/cards` 新規作成

- 入力 = パスパラメータ `listId`、 body = `{ title: string }`。
- 権限 = 対象ボードの `member` 以上。
- 処理。
  1. `list = resolveBoardFromList(listId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, list.boardId, "member")`。
  3. body を zod 検証。
  4. 1 トランザクション内で `card.aggregate({ where: { listId }, _max: { order: true } })` → `card.create({ data: { listId, title, description: "", order: (max ?? -1) + 1 } })`。
- 出力 = `201 Card`。
- ステータス = `201` / `401` / `403` / `404` / `422`。
- ログ = `event=card.create`、 `targetId=新規 cardId`、 `context={ listId, boardId, title }`。

### `PATCH /api/cards/{cardId}` タイトル / 説明文の更新

- 入力 = パスパラメータ `cardId`、 body = `{ title?: string, description?: string }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション。
  - `title` 指定時 = 文字列。 トリム後 1〜200 文字。 違反時 `422 { title: "required" | "too_long" | "invalid_type" }`。
  - `description` 指定時 = 文字列。 0〜2000 文字、 トリムしない。 違反時 `422 { description: "too_long" | "invalid_type" }`。
  - 両方未指定 = `422 { _: "no_updates" }` (フィールドキーは `_` を採用、 body 全体に対する検証エラーを表す)。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "member")`。
  3. `prisma.card.update({ where: { id: cardId }, data: { ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}) } })`。
- 出力 = `200 Card`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=card.update`、 `context={ cardId, boardId, changedFields: ["title", ...] }` (旧値は description サイズ次第で省略)。

### `DELETE /api/cards/{cardId}` 削除

- 入力 = パスパラメータ `cardId` (body なし)。
- 権限 = 対象ボードの `member` 以上。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "member")`。
  3. 1 トランザクション内で以下。
     a. `prisma.card.delete({ where: { id: cardId } })`。
     b. `prisma.card.updateMany({ where: { listId: card.listId, order: { gt: card.order } }, data: { order: { decrement: 1 } } })`。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=card.delete`、 `context={ cardId, listId, boardId, title }`。

### `PATCH /api/cards/{cardId}/order` 並び替え

- 入力 = パスパラメータ `cardId`、 body = `{ toListId: string, toIndex: number }`。
- 権限 = 対象ボードの `member` 以上。 かつ `toListId` が**同一ボード内**であること。
- バリデーション。
  - `toListId` は文字列。 存在しない or 別ボードなら `404` (`spec/003_cards.md § 異常系` の「別ボードのリスト指定は 404」)。
  - `toIndex` は 0 以上の整数。 違反時 `422 { toIndex: "invalid_position" }`。
  - `toIndex` の上限。
    - 同一リスト内並び替え (`toListId === fromListId`) = `count - 1` (自身を含む count)。
    - 別リスト移動 (`toListId !== fromListId`) = `toCount` (移動先リストのカード数、 末尾追加を許すため `[0, toCount]`)。
    - 上限超過は `422 { toIndex: "out_of_range" }`。
- 処理 (1 トランザクション)。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `fromListId = card.listId`、 `boardId = card.list.boardId`、 `oldOrder = card.order`。
  3. `assertBoardAccess(userId, boardId, "member")`。
  4. `toList = resolveBoardFromList(toListId)`、 未存在 or `toList.boardId !== boardId` なら `404`。
  5. body の zod 検証と範囲チェック (上記)。
  6. 分岐。
     - **同一リスト内** (`toListId === fromListId`)。
       - `toIndex === oldOrder` なら早期 return (`updatedAt` は明示更新)。
       - 対象 card を `order = -1` 等の一時値に退避 → 兄弟レコードを移動方向に応じて ±1 → 対象を `toIndex` に更新。
     - **別リスト移動** (`toListId !== fromListId`)。
       - 対象 card を `order = -1`、 `listId` は変更しないまま退避 (`@@unique([listId, order])` 衝突回避のため)。
       - 移動元リストで `order > oldOrder` を `decrement: 1` で詰める。
       - 移動先リストで `order >= toIndex` を `increment: 1` で開ける。
       - 対象 card を `listId = toListId`、 `order = toIndex` に更新。
  7. `updatedAt` を対象 card に明示更新 (Prisma の `@updatedAt` により自動的に更新される)。
- 出力 = `200 Card` (更新後の card)。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=card.reorder`、 `context={ cardId, boardId, fromListId, toListId, oldOrder, newOrder }`。

## UI 構造

### 配置

- `design/002_lists.md § UI 構造` で定義した `BoardListsView` (`DndContext` 提供元) の内側に、 リスト単位で `CardList`、 その内側に `CardRow` を配置する。
- `@dnd-kit/core` の `useSortable` を Card 側と List 側で並存させ、 draggable 種別を「list」 / 「card」 で識別する。

### 主要 Client Component

| コンポーネント | 責務 |
|---|---|
| `CardList` | リスト内カード群の縦並び描画と DnD 受け皿。 |
| `CardRow` | 1 カードの行表示。 クリックで `CardDetailModal` を開く。 |
| `CardCreateForm` | 各リスト下部の新規作成 form。 `POST /api/lists/{listId}/cards` を叩く。 |
| `CardDetailModal` | 詳細モーダル。 title / description 編集、 削除導線、 `createdAt` / `updatedAt` 表示。 |
| `CardDeleteConfirm` | モーダル内の削除確認 (`window.confirm` で初期実装)。 |

### モーダル URL 紐付け

- URL クエリ `?card={cardId}` と `CardDetailModal` を双方向紐付ける。
  - カード行クリック → `router.replace(pathname + "?card=" + cardId, { scroll: false })` でクエリ更新 → クエリ変更を検知したモーダルコンポーネントがカード情報を fetch して表示。
  - モーダル閉じる → `router.replace(pathname, { scroll: false })` でクエリ除去。
  - 直リンク遷移や戻る操作にも追従する。
- `spec/003_cards.md § カード詳細モーダルの基本構造` の初期方針は「URL に紐づけない」 だが、 未決事項として `ui-design/` に委ねられている。 本設計は「共有可能な URL」 「ブラウザバックで閉じられる」 の 2 点で操作性が明確に上がると判断し、 `?card={cardId}` クエリ紐付けを採用する。

### description の表示

- 初期実装は plain text (`<pre>` または `whitespace-pre-wrap` 相当) で表示。 Markdown レンダリングは対象外 (`spec/003_cards.md § 未決事項`)。

### 楽観的更新

- カード並び替えは `design/002_lists.md § 楽観的更新の方針` と同じ形式。 表示用 state とサーバー state を分離し、 API 失敗時に元順序へロールバックする。
- 別リスト移動時は「移動元 list からの除去」 と「移動先 list への挿入」 の 2 側を同時に更新する。

### 空状態

- カード 0 件のリストは `CardList` 内で空状態を描画し、 `CardCreateForm` への導線を強調する (文言は `ui-design/`)。

## 状態遷移

### エンティティ状態

```
[存在せず]  --POST-->  [存在 (order=末尾, description="")]
[存在]      --PATCH title/description-->  [存在 (title/description 更新, updatedAt 更新)]
[存在]      --PATCH order (同一リスト内)-->  [存在 (order 更新, 兄弟詰め直し, updatedAt 更新)]
[存在]      --PATCH order (別リスト)-->     [存在 (listId 更新, 元/先の兄弟詰め直し, updatedAt 更新)]
[存在]      --DELETE-->  [存在せず (兄弟 order 詰め直し)]
[List 削除] --Cascade-->  [存在せず]
[Board 削除]--Cascade-->  [存在せず]
```

### UI 状態遷移 (詳細モーダル)

```
closed → clicked-row → ?card={id} 反映 → fetching → open (title/description 表示)
open → edit-title → submitting → success → open (title 反映)
                              ↘ error(422) → open + field error 表示
open → edit-description → submitting → success → open (description 反映)
                                      ↘ error(422) → open + field error 表示
open → delete → confirm → deleting → success → closed (?card= 除去) + カード行が消える
open → close-button / Esc → closed (?card= 除去)
open → 404 (別セッションで削除) → closed + toast 表示
```

## 非機能の実装方針

### 性能

- `GET /api/lists/{listId}/cards` は `@@index([listId])` 経由の絞り込み + `orderBy: order` のみで P95 200ms 以内は容易。
- 並び替えは影響を受ける行数 = 単一リスト内なら `count`、 別リスト移動なら移動元 + 移動先の対象範囲。 通常は数十行以下、 P95 300ms 以内を維持。
- 詳細モーダルの description 表示は 2000 文字上限なので描画コストの懸念なし。

### セキュリティ

- 別ボードの list を `toListId` に指定した場合、 「別ボードのリソースの存在有無を漏らさない」 ため `404` を返す (`spec/003_cards.md § 異常系` の判断)。 これは `assertBoardAccess` が `403` を返すロジックとは経路を分けて実装する必要がある。
- `PATCH /api/cards/{cardId}` の body は `title` と `description` の 2 field のみ受理し、 それ以外 (`listId` / `order` / `createdAt` 等) は無視する (zod の `.strict()` で余剰キーを拒否する)。

### 運用

- 並び替えは fromList / toList / oldOrder / newOrder を全て `context` に残す。 別リスト移動時の不整合を追跡可能にする。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/lists/{listId}/cards` | `resolveBoardFromList` → `assertBoardAccess(userId, boardId, "viewer")` | 未認証 `401`、 未存在 / 閲覧不可 `404` |
| `GET /api/cards/{cardId}` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "viewer")` | 未認証 `401`、 未存在 / 閲覧不可 `404` |
| `POST /api/lists/{listId}/cards` | `resolveBoardFromList` → `assertBoardAccess(userId, boardId, "member")` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403` |
| `PATCH /api/cards/{cardId}` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "member")` | 同上 |
| `DELETE /api/cards/{cardId}` | 同上 | 同上 |
| `PATCH /api/cards/{cardId}/order` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "member")` + `resolveBoardFromList(toListId)` で `boardId` 一致を検証 | 同上 + `toListId` が別ボードなら `404` |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `card.list` 成功 | `info` | `actorId`、 `context={ listId, boardId, count }`、 `status=200` |
| `card.get` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ boardId }`、 `status=200` |
| `card.create` 成功 | `info` | `actorId`、 `targetId=新規 cardId`、 `context={ listId, boardId, title }`、 `status=201` |
| `card.update` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ boardId, changedFields }`、 `status=200` |
| `card.delete` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ listId, boardId, title }`、 `status=204` |
| `card.reorder` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ boardId, fromListId, toListId, oldOrder, newOrder }`、 `status=200` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成 (Board / List 設計と共通)

- 単体テスト … zod スキーマ、 `lib/order/card.ts` に切り出した並び替え計算 (同一リスト内 / 別リスト間の 2 モード)。
- Route Handler テスト … 独立 SQLite テスト DB。 `getCurrentUser` 差し替え。
- UI テスト … `CardDetailModal` の開閉と URL クエリ同期を `@testing-library/react` で検証 (優先度中)。

### ケース一覧

| 種別 | ケース例 |
|---|---|
| 正常系 | 一覧取得 / 詳細取得 / 作成 / title 更新 / description 更新 (空文字保存含む) / 削除 / 同一リスト並び替え / 別リスト移動 |
| 権限 | `viewer` で `POST` / `PATCH` / `DELETE` / `PATCH order` が全て `403`。 未参加ユーザーは全て `404` |
| 未存在 | 存在しない `listId` で `GET` / `POST` = `404`。 存在しない `cardId` で全 API = `404`。 存在するが別ボードの `toListId` = `404` |
| バリデーション | `title` 空 / トリム後 0 / 201 文字 = `422`。 `description` 2001 文字 = `422`。 `PATCH` で title と description の両方未指定 = `422 no_updates`。 `toIndex` 負 / 非整数 / 超過 = `422` |
| 境界 | `title` 1 / 200 文字、 `description` 0 / 2000 文字、 `toIndex` 0 / 上限で成功、 それぞれ上限 +1 で `422` |
| 並び替え | 同一リスト内 3 パターン (前→後 / 後→前 / 同位置) / 別リスト間 3 パターン (先頭挿入 / 中間挿入 / 末尾追加)。 移動元の残カード `order` が詰められ、 移動先の既存カード `order` が押し出される |
| 一意性 | 並び替え途中で `@@unique([listId, order])` 制約に違反しない (一時値退避 → updateMany → 目的値更新の順序を検証) |
| カスケード | List 削除でその配下 Card が全消え、 その Card に対する `GET` は `404` |
| モーダル URL | `CardRow` クリックで `?card={id}` が付与される、 モーダル閉じで除去される、 直リンクアクセスでモーダルが開いた状態でレンダされる |
| description 空文字 | 空文字で保存 → GET したときに `""` が返る (null や欠落にならない) |

### 補助ヘルパ

- `tests/helpers/factories.ts` に `createCard(list, {title?, description?, order?})` を追加する。
- 並び替えテストは「並び替え後の `[cardId, order]` ペア」 を配列で assert するヘルパを作り、 期待値との構造比較で書く。

## 実装方針 (本設計で固定する判断)

- 並び替え API のリクエスト body は `{ toListId: string, toIndex: number }` に固定する (`spec/003_cards.md § 未決事項` の判断)。 `beforeCardId` 指定 / `order` 直接指定は採用しない。
- 楽観的更新はクライアント側 state 分離で実装し、 サーバー応答で再同期する (`spec/003_cards.md § 未決事項` の判断)。
- カード詳細モーダルの URL 紐付けは `?card={cardId}` クエリを採用する (`spec/003_cards.md § 未決事項` の判断)。 パス変更 (`/boards/[id]/cards/[cardId]`) は採用しない (モーダルの本質は「オーバーレイ」 なので、 パスを別ページ扱いにするとブラウザバック挙動と衝突する)。
- description は plain text の `whitespace-pre-wrap` 表示に固定する (`spec/003_cards.md § 未決事項` の判断)。 Markdown レンダリングは本 spec の対象外。
- `order` 再割当は「対象を一時値退避 → 兄弟を `updateMany` で ±1 → 対象を目的値に更新」 を採用する。 別リスト移動時は移動元と移動先の 2 リストに対して独立に行う。

## 実装順序

1. **`design/001_boards.md § 実装順序` と `design/002_lists.md § 実装順序` を先に完了させる**
   Board 側の Prisma / 認証 / audit / errors 共通部品と、 List 側の CRUD + DnD 実装が Card 実装の前提。
2. **`order` 計算ロジックの pure 化**
   `lib/order/card.ts` に「同一リスト内 old→new」 と「別リスト間 fromList / toList」 の 2 モードの pure 関数を切り出し、 単体テストを書く。 別リスト間は「fromList 側の詰め direction」 と「toList 側の押し出し direction」 の 2 系統を返す。
   依存 = なし。
3. **Card API 6 endpoint (並び替え以外を先に)**
   `app/api/lists/[listId]/cards/route.ts` (`GET` / `POST`) → `app/api/cards/[cardId]/route.ts` (`GET` / `PATCH` / `DELETE`) → 最後に `app/api/cards/[cardId]/order/route.ts` (`PATCH`) の順で実装する。 並び替えを最後に置くのは、 それまでの 5 endpoint で Card エンティティの一通りの操作が完結し、 テストデータを実 API 経由で構築できるようになるため。
   依存 = 手順 1、 2。
4. **Card UI (静的描画 → 作成 → 詳細モーダル → DnD)**
   `CardList` / `CardRow` を静的描画 → `CardCreateForm` を接続 → `CardDetailModal` の title / description 編集と削除を接続 → `?card={id}` クエリ紐付けを実装 → 最後に List の `DndContext` に Card sortable を組み込む (楽観的更新含む)。
   依存 = 手順 3。
5. **テスト整備**
   pure 単体テスト (手順 2) → Route Handler テスト (手順 3、 並び替えの 6 パターン網羅を含む) → UI テスト (`CardDetailModal` の URL 同期) の順で追加する。
   依存 = 手順 2〜4。
