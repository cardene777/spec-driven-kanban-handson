# リスト機能の設計

## 関連仕様

- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`

## 前提

- Board のデータモデル・権限判定・監査ログ方針は `design/001_boards.md` を継承。
- List は Board に属するため、権限判定はまず Board の Membership を確認してから行う。

## データモデル

Prisma スキーマ（抜粋）:

```prisma
model List {
  id        String   @id @default(cuid())
  boardId   String
  title     String
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards Card[]

  @@unique([boardId, order])
}
```

- `@@unique([boardId, order])` で同一ボード内の並び順を一意に保つ。
- Board 削除で List も `onDelete: Cascade` により消える。

## API 設計

| メソッド | パス | 入力 | 出力（成功） | ステータス | 権限 | ログ |
|---|---|---|---|---|---|---|
| GET | `/api/boards/{boardId}/lists` | パス `boardId` | `{ "items": List[] }` | 200 | 対象ボードの `viewer` 以上 | `list.list.view` |
| POST | `/api/boards/{boardId}/lists` | `{ "title": string }` | `List` | 201 | 対象ボードの `member` 以上 | `list.create` |
| PATCH | `/api/lists/{listId}` | `{ "title": string }` | `List` | 200 | 所属ボードの `member` 以上 | `list.update` |
| DELETE | `/api/lists/{listId}` | パス `listId` | なし | 204 | 所属ボードの `member` 以上 | `list.delete` |

- クライアントからは `id` / `order` / `createdAt` / `updatedAt` を受け付けない。
- 一覧 API は `order` 昇順 → `createdAt` 昇順で返す。

## UI 構造

- ボード詳細（`/boards/[boardId]`）内で、リストを横並びに表示する。
- 各リストにヘッダー（`title` + 「編集」「削除」）を持ち、下にカード縦並び領域（詳細は `003_cards.md`）。
- 末尾に「新しいリスト」追加フォームを配置。

## 状態遷移

- List の削除は「確認 → 削除 → 一覧再取得」。UI 詳細は `/ui-design` で決める。

## 非機能の実装方針

### 性能

- 一覧 API は `WHERE boardId=? ORDER BY order ASC` を索引で高速化。P95 200ms 以内。

### セキュリティ

- Route Handler の入口で「対象 Board の Membership を確認 → 該当なしなら 404、`viewer` は書き込み時 403」の順で判定する。

### 運用

- 監査ログは `list.create` / `list.update` / `list.delete` の 3 種類。
- 一覧取得は成功時のみ `list.list.view` を info で残す（大量ログ回避のため件数のみ記録）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| Route Handler 冒頭 | `currentUser()` が null | 401 UNAUTHORIZED |
| 対象存在確認 | 対象 Board（一覧・作成）/ 対象 List（更新・削除）が存在するか | 404 NOT_FOUND |
| Membership 確認 | `viewer` 以上（GET）/ `member` 以上（POST/PATCH/DELETE） | 一覧 404、書き込み 403 |
| POST/PATCH 前 | `validateTitle(body.title, 100)` | 422 VALIDATION_ERROR |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `list.create` | info | `actor`, `boardId`, `listId`, `title` |
| `list.update` | info | `actor`, `boardId`, `listId`, `title` |
| `list.delete` | info | `actor`, `boardId`, `listId` |

## 実装方針

- List Route Handler は Board の権限確認関数 `requireBoardRole(boardId, minRole)` を再利用する。
- `PATCH` と `DELETE` は List の boardId を取ってから権限確認する。
- リポジトリ層 `lib/repository/list.ts` に `findByBoard`, `findById`, `create`, `updateTitle`, `delete` を置く。

## テスト方針

- `tests/api/lists.test.ts` で FR-001〜FR-008 をカバー。
- 存在しない boardId、閲覧不可 Board、`viewer` からの書き込み、trim 検証、末尾追加の連番を含める。
- Prisma はモック（`design/001_boards.md` と同じ方式）。

## 実装順序

1. `prisma/schema.prisma` に `List` を追加、`npx prisma migrate dev --name add_list` を実行。
2. `lib/repository/list.ts` を実装。
3. `app/api/boards/[boardId]/lists/route.ts`（GET/POST）と `app/api/lists/[listId]/route.ts`（PATCH/DELETE）を実装。
4. `app/boards/[boardId]/_components/ListColumn.tsx` と `ListCreateForm.tsx`、`ListHeader.tsx` を追加。
5. `tests/api/lists.test.ts` を書き、`npm run lint / typecheck / test / build` を全通しにする。
