# リスト機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`

## 前提

Prisma 全体スキーマ、 認証・認可の共通ユーティリティ (`getCurrentUser` / `assertBoardAccess`)、 エラーレスポンスヘルパ、 監査ログ形式、 バリデーション方針 (zod)、 `order` の内部表現、 カスケード削除は `design/001_boards.md § 共通設計方針` に定義済み。 本 file は List 固有の設計のみ記述する。

## データモデル

### List (Prisma、 `design/001_boards.md` の schema から再掲)

```prisma
model List {
  id        String   @id @default(cuid())
  boardId   String
  title     String
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards     Card[]

  @@unique([boardId, order])
  @@index([boardId])
}
```

- `title` は `String`、 アプリ層でトリム済み 1〜100 文字を保証。
- `order` は `Int` の 0 起点連番。 同一 `boardId` 内で一意 (`@@unique([boardId, order])`)。
- Board 削除時に `onDelete: Cascade` でリスト自身が消え、 リスト削除時にはカードが Cascade で消える (2 段カスケード)。

### List リソース JSON 表現

```json
{
  "id": "clx...",
  "boardId": "clx...",
  "title": "TODO",
  "order": 0,
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

一覧 API は `{ "items": [List, ...] }` を返す。

## API 設計

`spec/002_lists.md § API` の 5 endpoint を Route Handler で実装する。 file 配置。

- `app/api/boards/[boardId]/lists/route.ts` … `GET` / `POST`
- `app/api/lists/[listId]/route.ts` … `PATCH` / `DELETE`
- `app/api/lists/[listId]/order/route.ts` … `PATCH`

### `GET /api/boards/{boardId}/lists` 一覧取得

- 入力 = パスパラメータ `boardId`。
- 権限 = 対象ボードの `viewer` 以上 (未存在 / 閲覧不可はいずれも `404`)。
- 処理 = `assertBoardAccess(userId, boardId, "viewer")` → `prisma.list.findMany({ where: { boardId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] })`。
- 出力 = `200 { items: List[] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=list.list`、 `context={ boardId, count }`。

### `POST /api/boards/{boardId}/lists` 新規作成

- 入力 = パスパラメータ `boardId`、 body = `{ title: string }`。
- 権限 = 対象ボードの `member` 以上 (`viewer` は `403`)。
- 処理 = 1 トランザクション内で以下。
  1. `assertBoardAccess(userId, boardId, "member")`。
  2. body を zod で検証、 失敗は `422`。
  3. `prisma.list.aggregate({ where: { boardId }, _max: { order: true } })`。
  4. `prisma.list.create({ data: { boardId, title, order: (max ?? -1) + 1 } })`。
- 出力 = `201 List`。
- ステータス = `201` / `401` / `403` / `404` / `422`。
- ログ = `event=list.create`、 `targetId=新規 listId`、 `context={ boardId, title }`。

### `PATCH /api/lists/{listId}` 名称更新

- 入力 = パスパラメータ `listId`、 body = `{ title: string }`。
- 権限 = 対象ボードの `member` 以上。
- 処理。
  1. `list = prisma.list.findUnique({ where: { id: listId } })`。 存在しなければ `404`。
  2. `assertBoardAccess(userId, list.boardId, "member")`。 未参加なら `404`、 `viewer` なら `403`。
  3. body を zod 検証。
  4. `prisma.list.update({ where: { id: listId }, data: { title } })`。
- 出力 = `200 List`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=list.update`、 `context={ boardId, oldTitle, newTitle }`。

### `DELETE /api/lists/{listId}` 削除

- 入力 = パスパラメータ `listId` (body なし)。
- 権限 = 対象ボードの `member` 以上。
- 処理。
  1. `list = findUnique`、 存在しなければ `404`。
  2. `assertBoardAccess(userId, list.boardId, "member")`。
  3. 1 トランザクション内で以下を実行する。
     a. `prisma.list.delete({ where: { id: listId } })` (配下 Card は Cascade で消える)。
     b. 同一 `boardId` の残リストのうち `order > 削除対象.order` を `updateMany({ data: { order: { decrement: 1 } } })` で詰め直す。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=list.delete`、 `context={ boardId, title, deletedCardCount }`。

### `PATCH /api/lists/{listId}/order` 並び替え

- 入力 = パスパラメータ `listId`、 body = `{ toIndex: number }`。
  - `toIndex` は 0 起点、 同一ボード内の**現存リスト数を上限**とする閉区間 `[0, count-1]`。 `count` (自身を含む) を上限とする理由は「同一 board 内でリストを『0 番目に持ってくる』 から『末尾に持ってくる』 まで」 の 0 起点表現に一致させるため。 別ボード移動は本 spec 対象外。
- 権限 = 対象ボードの `member` 以上。
- 処理。
  1. `list = findUnique`、 存在しなければ `404`。
  2. `assertBoardAccess(userId, list.boardId, "member")`。
  3. body を zod 検証。 `toIndex` が整数でない or 負なら `422 { toIndex: "invalid_position" }`。 `count = prisma.list.count({ where: { boardId: list.boardId } })` を取得、 `toIndex >= count` なら `422 { toIndex: "out_of_range" }`。
  4. `toIndex === list.order` なら `updatedAt` のみ触って早期 return (仕様上「並び替えのみの操作でも `updatedAt` 更新」)。
  5. 1 トランザクション内で以下を実行する。
     a. 対象 list を `order = -1` 等の一時値に退避 (`@@unique([boardId, order])` の衝突回避)。
     b. 移動方向に応じて中間レコードを `decrement` / `increment` で詰める。
        - `toIndex > oldOrder` … `order IN (oldOrder+1 .. toIndex)` を `decrement: 1`。
        - `toIndex < oldOrder` … `order IN (toIndex .. oldOrder-1)` を `increment: 1`。
     c. 対象 list の `order` を `toIndex` に更新、 `updatedAt` を明示更新。
- 出力 = `200 List` (更新後の対象 list を返す)。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=list.reorder`、 `context={ boardId, oldOrder, newOrder }`。

## UI 構造

### 配置

- `app/boards/[boardId]/page.tsx` (Server Component) がボード情報 + `List[]` + 各 List の `Card[]` を prisma で一括取得し、 `components/lists/BoardListsView.tsx` (Client Component) に渡す。
- `BoardListsView` が DnD コンテキストを提供し、 `ListColumn` (各リスト縦列) を横並び描画する。

### 主要 Client Component

| コンポーネント | 責務 |
|---|---|
| `BoardListsView` | `@dnd-kit/core` の `DndContext` を提供し、 リスト並び替えとカード並び替えを両方受ける (Card の DnD は `design/003_cards.md`)。 |
| `ListColumn` | 1 リスト分の枠。 title / メニュー / カード領域 / カード新規作成導線を配置。 |
| `ListTitleEditor` | インライン編集。 `PATCH /api/lists/{id}` を叩く。 |
| `ListDeleteMenu` | 削除メニュー + 確認ダイアログ + `DELETE /api/lists/{id}`。 |
| `ListCreateForm` | ボード詳細画面上部の新規作成 form。 `POST /api/boards/{boardId}/lists` を叩く。 |

### 楽観的更新の方針

- リスト並び替え時は UI 側で先に順序を更新し、 API 応答後に確定する (楽観的更新)。
- API が 4xx / 5xx を返した場合、 元の順序に戻す (`spec/002_lists.md § 画面レベル` の「ロールバック挙動」 に一致)。
- 実装は React state で持つ「表示用の並び順」 と、 サーバー側の「保存済み並び順」 を分離する。 サーバー応答が来たら表示用を再同期する。

### 空状態

- リスト 0 件時は `BoardListsView` が空状態プレースホルダを描画し、 `ListCreateForm` への導線を強調する (文言は `ui-design/`)。

## 状態遷移

### エンティティ状態

```
[存在せず]  --POST-->  [存在 (order=末尾)]
[存在]      --PATCH title-->  [存在 (title 更新, updatedAt 更新)]
[存在]      --PATCH order-->  [存在 (order 更新, 兄弟 order 詰め直し, updatedAt 更新)]
[存在]      --DELETE-->  [存在せず (配下 Card カスケード削除, 兄弟 order 詰め直し)]
[Board 削除]--Cascade-->  [存在せず]
```

- 削除と並び替えは兄弟レコードの `order` を巻き込む。 いずれも 1 トランザクションでアトミックに完結させる。

### UI 状態遷移 (並び替え)

```
idle → dragging → optimistic-updated → api-pending
      ↘ dropped-same-position → idle (API 呼ばず)
                              api-pending → success (サーバー応答で確定) → idle
                                          ↘ error → rollback (UI 順序を元に戻す) → idle
```

## 非機能の実装方針

### 性能

- リスト一覧取得はボード詳細ページの初期描画時にサーバーコンポーネントで prisma 直接クエリを実行し、 追加の HTTP 往復を避ける。 P95 200ms 以内は SQLite ローカル + `@@index([boardId])` で十分。
- 並び替えは対象ボード内リスト数 (通常 数〜十数件) 分の `updateMany` 1 発 + 対象 1 レコード update。 P95 300ms 以内。

### セキュリティ

- `/api/lists/{listId}` 系は listId → boardId → boardAccess の順で解決する。 `list.boardId` を DB から取ってから権限判定するため「別ボードのリストを勝手に指定して更新」 は成立しない。

### 運用

- 並び替え時、 `context` に `oldOrder` / `newOrder` の両方を残す。 デバッグ時に「並び替え後の順序不整合」 を追跡可能にするため。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/boards/{boardId}/lists` | `assertBoardAccess(userId, boardId, "viewer")` | 未認証 `401`、 未存在 / 閲覧不可 `404` |
| `POST /api/boards/{boardId}/lists` | `assertBoardAccess(userId, boardId, "member")` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403` |
| `PATCH /api/lists/{listId}` | list → `assertBoardAccess(userId, list.boardId, "member")` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403` |
| `DELETE /api/lists/{listId}` | 同上 | 同上 |
| `PATCH /api/lists/{listId}/order` | 同上 | 同上 |

`assertBoardAccess` の内部順序は「Board 存在 → membership 存在 → role 比較」 の 3 段。 `viewer` が更新系を呼んだ時のみ `403`、 それ以外の権限不足パターン (未参加、 未存在) は `404` に集約する。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `list.list` 成功 | `info` | `actorId`、 `context={ boardId, count }`、 `status=200` |
| `list.create` 成功 | `info` | `actorId`、 `targetId=新規 listId`、 `context={ boardId, title }`、 `status=201` |
| `list.update` 成功 | `info` | `actorId`、 `targetId=listId`、 `context={ boardId, oldTitle, newTitle }`、 `status=200` |
| `list.delete` 成功 | `info` | `actorId`、 `targetId=listId`、 `context={ boardId, title, deletedCardCount }`、 `status=204` |
| `list.reorder` 成功 | `info` | `actorId`、 `targetId=listId`、 `context={ boardId, oldOrder, newOrder }`、 `status=200` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式に一致 |

## テスト方針

### Vitest 構成 (Board 設計と共通)

- 単体テスト … zod スキーマ、 order 再割当ロジック (pure 関数として `lib/order/list.ts` に切り出し、 副作用なしの単体で検証可能にする)。
- Route Handler テスト … 独立 SQLite テスト DB (`prisma/test.db`)。 `getCurrentUser` を差し替え、 各ロール (`owner` / `member` / `viewer` / 未参加 / 未認証) を切り替える。

### ケース一覧

| 種別 | ケース例 |
|---|---|
| 正常系 | 一覧取得 (0 件 / 複数件) / 作成 / 名称更新 / 削除 / 並び替え |
| 権限 | `viewer` で `POST` / `PATCH` / `DELETE` / `PATCH order` を叩き `403`。 未参加ユーザーで各 API を叩き `404` |
| 未存在 | 存在しない `boardId` で `GET` / `POST` = `404`。 存在しない `listId` で `PATCH` / `DELETE` / `PATCH order` = `404` |
| バリデーション | `title` 空 / 前後空白のみ / 101 文字 = `422`。 `toIndex` = `-1` / 非整数 / `count` 超過 = `422` (fields キー `invalid_position` / `out_of_range`) |
| 境界 | `title` = 1 / 100 文字で成功、 101 文字で `422`。 `toIndex` = 0 / `count-1` で成功、 `count` で `422 out_of_range` |
| 並び替え | 3 件並び替え後 `order` が `0/1/2` を保つ (前 → 後、 後 → 前、 同位置指定の 3 パターン)。 削除で残リストの `order` が詰められる |
| カスケード | List 削除でその配下 Card が全消え、 その List に対する `GET` は `404` |
| 一意性 | 同一 `boardId` 内で `order` 重複が発生しない (並び替え途中の一時値退避を含めて) |
| 別ボード非干渉 | 別 `boardId` の List に対して `PATCH order` の `toIndex` 検証が別ボードのカウントを参照しない |

### 補助ヘルパ

- `tests/helpers/factories.ts` に `createUser` / `createBoard` / `addMember(user, board, role)` / `createList(board, {title, order?})` を作り、 テスト内での前提データ構築を簡略化する。

## 実装方針 (本設計で固定する判断)

- 並び替え API リクエスト body は `{ toIndex: number }` に固定する (`spec/002_lists.md § 未決事項` の判断)。 `beforeListId` 指定 / `order` 直接指定は採用しない。
- 楽観的更新はクライアント側 state 分離で実装し、 サーバー応答による再同期を default とする (`spec/002_lists.md § 未決事項` の判断)。
- DnD ライブラリは `@dnd-kit/core` を採用する。 React 18 + TypeScript の型定義が最も安定し、 accessibility 対応が組み込みのため (`spec/002_lists.md § 未決事項` の判断)。
- `order` 再割当は「対象を一時値退避 → 兄弟を `updateMany` で ±1 → 対象を目的値に更新」 の 3 段方式に固定する。 SQLite の `@@unique([boardId, order])` 制約下で衝突しない唯一の順序である。

## 実装順序

1. **`design/001_boards.md § 実装順序` の手順 1〜2 を先に完了させる**
   Prisma 全体 schema と共通ユーティリティ (`getCurrentUser` / `assertBoardAccess` / errors / audit) が List 実装の前提。
2. **`order` 再割当ロジックの pure 化**
   `lib/order/list.ts` に「old / new / count が与えられた時にどの範囲を ±1 するか」 を計算する pure 関数を切り出し、 単体テストを書く。 Route Handler は本関数を呼ぶ薄いラッパになる。
   依存 = なし (単体で完結)。
3. **List API 5 endpoint**
   `app/api/boards/[boardId]/lists/route.ts` (`GET` / `POST`) → `app/api/lists/[listId]/route.ts` (`PATCH` / `DELETE`) → `app/api/lists/[listId]/order/route.ts` (`PATCH`) の順で実装する。 各 endpoint は入口で `assertBoardAccess` を呼び、 業務処理を 1 トランザクションに閉じる。
   依存 = 手順 1、 2。
4. **List UI (静的描画 → 編集 → DnD)**
   まずボード詳細画面で `ListColumn` を静的横並び描画する → `ListCreateForm` / `ListTitleEditor` / `ListDeleteMenu` を接続 → 最後に `@dnd-kit/core` で並び替えと楽観的更新を実装する。 DnD は最後に置くことでそれまでの機能を通常操作でテスト可能にする。
   依存 = 手順 3。
5. **テスト整備**
   pure 単体テスト (手順 2) → Route Handler テスト (手順 3) の順で追加する。 UI テストは教材優先度低。
   依存 = 手順 2〜4。
