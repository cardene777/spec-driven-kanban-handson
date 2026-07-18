# ボード機能の設計

## 関連仕様

- `spec/000_shared_rules.md`
- `spec/001_boards.md`

## 前提

- 認証は本章 02 セクションでは開発用固定ユーザー（`dev-user`）で代替する（`spec/000_shared_rules.md § 認証の前提`）。
- Prisma 7 + `@prisma/adapter-better-sqlite3` を使う（`constitution.md § 技術スタック`）。
- エラー応答は `{ "error": { "code", "message", "details?" } }` で統一（`spec/000_shared_rules.md`）。
- 権限判定は「認証 → 対象存在 → 権限 → 入力検証」の順で入口チェック（同上）。
- 一覧レスポンスは `{ "items": [...] }`（同上）。

## データモデル

Prisma スキーマ（抜粋）:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  memberships BoardMembership[]
  boards      Board[]  @relation("BoardOwner")
}

model Board {
  id        String   @id @default(cuid())
  title     String
  order     Int
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner       User               @relation("BoardOwner", fields: [ownerId], references: [id])
  memberships BoardMembership[]
  lists       List[]

  @@unique([ownerId, order])
}

enum BoardRole {
  owner
  member
  viewer
}

model BoardMembership {
  id      String    @id @default(cuid())
  boardId String
  userId  String
  role    BoardRole

  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
}
```

- `BoardMembership` によりユーザーとボードの権限を管理。作成時は `role = owner` のレコードを1件作る。
- 削除時は `onDelete: Cascade` で BoardMembership / List / Card を巻き取る（`spec/000_shared_rules.md § カスケード削除`）。
- `@@unique([ownerId, order])` で同一 owner 内で `order` を一意に保つ（本章 02 セクションでは owner 単位の並び順で十分）。

## API 設計

| メソッド | パス | 入力 | 出力（成功） | ステータス | 権限 | ログ |
|---|---|---|---|---|---|---|
| GET | `/api/boards` | なし | `{ "items": Board[] }` | 200 | ログイン済み | `board.list.view` |
| GET | `/api/boards/{boardId}` | パス `boardId` | `Board` | 200 | 対象ボードの `viewer` 以上 | `board.view` |
| POST | `/api/boards` | `{ "title": string }` | `Board` | 201 | ログイン済み | `board.create` |
| PATCH | `/api/boards/{boardId}` | `{ "title": string }` | `Board` | 200 | 対象ボードの `owner` | `board.update` |
| DELETE | `/api/boards/{boardId}` | パス `boardId` | なし（body なし） | 204 | 対象ボードの `owner` | `board.delete` |

- リクエスト側の `id`, `order`, `createdAt`, `updatedAt` はサーバー側で生成し、クライアントからは受け付けない。
- `POST` では `dev-user` を owner とし、`BoardMembership` に `owner` レコードを作る（同一トランザクション）。
- 一覧 API はログイン中ユーザーの BoardMembership を JOIN し、`viewer` 以上のボードを返す。

## UI 構造

- `/`（ボード一覧）: 全ボードカード（`title` + 作成日時）をグリッド表示。右上に「新規ボード作成」ボタン。0 件時は空状態。
- `/boards/[boardId]`（ボード詳細）: ヘッダーにボードタイトル + 「編集」「削除」ボタン。本体にリスト一覧（詳細は `002_lists.md`）。
- コンポーネントの内訳（Atomic の分類は `/ui-design` 側）は本設計では扱わない。領域構成のみ確定する。

## 状態遷移

- ボード削除操作は「確認ダイアログ → 実削除 → 一覧へ戻る」の 3 段階。UI 詳細は `/ui-design` で決める。

## 非機能の実装方針

### 性能

- 一覧 API は BoardMembership JOIN + `order` 索引で 200ms 以内を狙う。
- `@@unique([ownerId, order])` に索引を張り、末尾追加時の `MAX(order)` 参照を高速化する。

### セキュリティ

- 認証は `lib/auth/currentUser.ts` で「開発用固定ユーザー」を返す。将来的にセッション実装へ差し替え可能な interface を守る。
- Board にアクセスするたびに BoardMembership の存在と `role` を確認し、存在確認だけで 404 と 403 を切り分ける。

### 運用

- 各 Route Handler の冒頭で `requestId`（`crypto.randomUUID()`）を発行し、成功 / 失敗ログに含める。
- 監査ログは `lib/audit/log.ts` を経由し、コンソールに `console.info(JSON.stringify({ ts, requestId, actor, action, target, status }))` の 1 行 JSON を出す。DB 保存は本章 02 セクションの範囲外。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| Route Handler 冒頭 | `currentUser()` が null | 401 UNAUTHORIZED |
| 対象存在確認 | Board が存在するか（`viewer` 以上のメンバーシップがあるか） | 404 NOT_FOUND |
| 書き込み系 | 対象ボードの `role === "owner"` | 403 FORBIDDEN |
| POST 前 | `validateBoardTitle(body.title)` | 422 VALIDATION_ERROR |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `board.create` | info | `actor`, `boardId`, `title` |
| `board.update` | info | `actor`, `boardId`, `title`（変更後） |
| `board.delete` | info | `actor`, `boardId` |
| 401/403/404/422 | warn | `actor` (推測)、`method`、`path`、`code` |

## 実装方針

- 認証取得と権限判定を Route Handler の共通関数として抽出（`lib/auth/currentUser.ts`、`lib/auth/requireBoardRole.ts`）。理由: 4 章以降で同じ判定を再利用するため。
- Prisma クライアントは `lib/prisma.ts` に集約し、adapter 経由でシングルトン化。
- `validateBoardTitle(raw)` で trim → 1〜100 文字を判定。共通の `lib/validation/text.ts` を作り、Board / List / Card 共通で使えるようにする（Card は上限 200）。
- 監査ログは `lib/audit/log.ts` に集約し、`log("board.create", { actor, boardId })` の1関数で呼べる形にする。

## テスト方針

- `tests/api/boards.test.ts` で Board CRUD の受入条件 FR-001〜FR-009 をカバー。
- Prisma を実 DB ではなくインメモリのモックに差し替える（第2章の `simple_skill/tests/api/kanban.test.ts` と同方式）。
- 認証は `currentUser()` をモック化し、`dev-user` を返す・null を返すの切り替えで 401 パターンも検証する。
- ロールは BoardMembership のモックで切り替えて 403 と 404 の区別を検証する。

## 実装順序

1. `prisma/schema.prisma` に User / Board / BoardMembership を定義し、`npx prisma migrate dev --name init` で `dev.db` を作る。
   理由: 以後のリポジトリ層・API 実装がスキーマに依存する。
2. `lib/prisma.ts`、`lib/auth/currentUser.ts`、`lib/auth/requireBoardRole.ts`、`lib/validation/text.ts`、`lib/errors.ts`、`lib/audit/log.ts` を作成。
   理由: 権限判定・バリデーション・エラー応答を Route Handler から呼べるようにする。
3. `lib/repository/board.ts` を作り、`list()`, `findById()`, `create()`, `updateTitle()`, `delete()` を実装。
4. `app/api/boards/route.ts` と `app/api/boards/[boardId]/route.ts` を実装（GET/POST、PATCH/DELETE、GET single）。
5. `app/page.tsx`（ボード一覧）と `app/_components/BoardCreateForm.tsx` を実装。
6. `app/boards/[boardId]/page.tsx`（ボード詳細ヘッダー + リスト領域 placeholder）を実装。
7. `tests/api/boards.test.ts` を書き、`npm run lint / typecheck / test / build` を全通しにする。
