# ボード機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`

## 本 file の位置付け

Board / List / Card 設計に共通する土台 (Prisma スキーマ全体、 認証・認可の共通ユーティリティ、 `order` の内部表現、 カスケード削除方針、 ログ形式) は本 file にまとめる。
`design/002_lists.md` と `design/003_cards.md` は本 file を参照し、 List / Card 固有の項目のみを記述する。

## 共通設計方針

### ID 生成方式

- Prisma `@default(cuid())` を全リソース (User / Board / List / Card / BoardMembership) に適用する。
- URL パラメータ (`boardId` / `listId` / `cardId`) は文字列として受け取り、 フォーマット検証は行わず「存在すれば取得、 存在しなければ `404`」 で扱う (`spec/000_shared_rules.md § リソース識別子`)。

### `order` の内部表現

- `order` は `Int` (0 起点の整数連番)。
- 一意性スコープは Board / List / Card それぞれ以下の通り。
  - Board = 全体
  - List = 同一 `boardId` 内
  - Card = 同一 `listId` 内
- 新規作成時は該当スコープ内の `max(order) + 1` を採用 (0 件なら `0`)。
- 並び替え時は「対象と移動先の間にあるレコードを ±1 で詰め直す」 単純再割当方式を採用する。 影響行数は同一スコープ内のみで、 ハンズオン規模 (数十件) では性能問題を起こさない。
- 一意制約 = 複合ユニーク `@@unique([<scope>, order])`。 再割当は 1 トランザクション内で `updateMany` により実施する。

### カスケード削除

- Prisma スキーマの relation に `onDelete: Cascade` を付与し、 DB 制約で実現する。
  - `Board` 削除 → `BoardMembership` / `List` / `Card` が全削除される
  - `List` 削除 → `Card` が全削除される
- アプリ層で明示 delete を行わない (SQLite の外部キー制約に一元化)。

### 認証・認可の共通ユーティリティ

- `lib/auth/currentUser.ts` に `getCurrentUser(request): Promise<User | null>` を実装し、 全 Route Handler の入口で呼ぶ (`spec/000_shared_rules.md § 認証の前提`)。 認証機構自体は別 spec のため、 本設計では「呼べば User が返る」 抽象に留める。
- `lib/auth/boardAccess.ts` に以下の 2 関数を実装する。
  - `getBoardRole(userId, boardId): Promise<Role | null>` … `BoardMembership` を 1 件 SELECT し、 `owner` / `member` / `viewer` / `null` (未参加) を返す。
  - `assertBoardAccess(userId, boardId, requiredRole): Promise<{ board, role }>` … 存在 + 権限を一度に判定し、 未存在または未参加は `NotFoundError`、 権限不足は `ForbiddenError` を throw する。
- Route Handler は `try { ... } catch` で例外を HTTP に変換する薄い `withApiHandler` ラッパを共有する。
- 認証・認可の判定順序は `spec/000_shared_rules.md § Route Handler の入口チェック順序` に従う (1 認証 → 2 存在 → 3 権限 → 4 バリデーション → 5 業務)。

### エラーレスポンス

`spec/000_shared_rules.md § HTTP ステータスコード` に一致させる。 body 生成は `lib/http/errors.ts` の以下ヘルパに集約する。

| ヘルパ | ステータス | body |
|---|---|---|
| `unauthorized()` | `401` | `{ "error": "unauthorized" }` |
| `forbidden()` | `403` | `{ "error": "forbidden" }` |
| `notFound()` | `404` | `{ "error": "not_found" }` |
| `validationError(fields)` | `422` | `{ "error": "validation_error", "fields": {...} }` |

### バリデーション

- `zod` を採用し、 API 単位に `schemas/boards.ts` 等のスキーマを配置する。
- トリム後長さ判定が必要な `title` は `z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(100))` 形式で表現する。
- スキーマ違反は `z.ZodError` を `validationError()` に変換して `422` を返す。 fields 形式は `{ [フィールド名]: メッセージキー }` に平坦化する (メッセージキーは `required` / `too_long` / `invalid_type` / `invalid_position` / `out_of_range` / `no_updates`)。

### 監査ログの共通形式

- `lib/log/audit.ts` の `logAudit(event)` を全書き込み系 API から呼ぶ。
- ログは 1 行 JSON (`console.log(JSON.stringify(event))`) で出力し、 ハンズオンでは標準出力に流す。
- 共通フィールド。

| フィールド | 型 | 内容 |
|---|---|---|
| `timestamp` | ISO8601 UTC | イベント発生時刻 |
| `level` | `info` / `warn` / `error` | 成功=`info`、 バリデーション失敗=`warn`、 権限違反や `404`=`warn`、 サーバーエラー=`error` |
| `event` | 文字列 | `board.create` / `board.update` / `list.reorder` などのドット記法 |
| `actorId` | 文字列 or `null` | 操作ユーザー ID。 未認証時は `null` |
| `targetType` | `board` / `list` / `card` | 対象種別 |
| `targetId` | 文字列 or `null` | 対象 ID。 作成時は生成 ID |
| `status` | 数値 | 返した HTTP ステータス |
| `errorCode` | 文字列 or `null` | `unauthorized` / `forbidden` / `not_found` / `validation_error` / `internal_error` |
| `context` | オブジェクト | 追加情報 (例: `{ boardId, oldOrder, newOrder }`) |

- 成功系ログには本 spec 対象の全書き込み操作 (作成 / 更新 / 削除 / 並び替え) を記録する。
- 失敗系ログには `401` / `403` / `404` / `422` / `5xx` の全ケースを記録する (`spec/000_shared_rules.md § 非機能要件` の運用要件)。

## データモデル

### Prisma スキーマ (全体、 3 file 共通の基盤)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  owner
  member
  viewer
}

model User {
  id          String            @id @default(cuid())
  name        String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  memberships BoardMembership[]
}

model Board {
  id          String            @id @default(cuid())
  title       String
  order       Int
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  memberships BoardMembership[]
  lists       List[]

  @@unique([order])
}

model BoardMembership {
  boardId   String
  userId    String
  role      Role
  createdAt DateTime @default(now())

  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([boardId, userId])
  @@index([userId])
}

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

- `Board.order` の全体一意は「本設計での初期実装 = 作成順末尾追加」 に対して十分。 将来のボード並び替え spec で複合キー変更が必要になれば migration で対応する。
- `List.order` は `(boardId, order)`、 `Card.order` は `(listId, order)` で複合ユニーク。
- `BoardMembership` は複合主キー `(boardId, userId)` で 1 ユーザー = 1 ボードあたり 1 ロール。

### Board 固有のフィールド設計

- `title` = `String`、 アプリ層でトリム済み 1〜100 文字を保証。 DB 制約による長さ検証は行わない (SQLite の text 長は事実上無制限)。
- `order` = 前述の全体一意連番。

### Board リソース JSON 表現 (API レスポンス共通)

```json
{
  "id": "clx...",
  "title": "個人タスク",
  "order": 3,
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

一覧 API では `{ "items": [Board, ...] }` を返す (`spec/000_shared_rules.md § 一覧 API のレスポンス構造`)。

## API 設計

以下、 `spec/001_boards.md § API` の 5 endpoint を Route Handler として実装する。 file 配置は `app/api/boards/route.ts` と `app/api/boards/[boardId]/route.ts`。

### `GET /api/boards` 一覧取得

- 入力 = クエリなし。 ヘッダの認証情報のみ。
- 権限 = ログイン済み。 追加権限判定なし。
- 処理 = `BoardMembership.findMany({ where: { userId }, include: { board: true } })` で自ユーザーが `viewer` 以上で所属するボードを取得、 `board.order` 昇順 → `board.createdAt` 昇順で返す。
- 出力 = `200 { items: Board[] }`。
- ステータス = `200` / `401`。
- ログ = 成功時のみ `event=board.list`、 `status=200`。 401 は `event=board.list`、 `status=401`、 `level=warn`。

### `GET /api/boards/{boardId}` 詳細取得

- 入力 = パスパラメータ `boardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理 = `assertBoardAccess(userId, boardId, "viewer")` → `board` を返す。 未存在も閲覧不可も `NotFoundError` に集約する (`spec/001_boards.md § 異常系` の「閲覧権限がないボードを 404 とする」 に一致)。
- 出力 = `200 Board`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=board.get`。

### `POST /api/boards` 新規作成

- 入力 body = `{ title: string }`。
- 権限 = ログイン済みユーザー。 作成者が自動で `owner` になる。
- 処理 = 1 トランザクション内で以下を実行する。
  1. `Board.aggregate({ _max: { order: true } })` で末尾 order を取得。
  2. `Board.create({ data: { title, order: (max ?? -1) + 1 } })`。
  3. `BoardMembership.create({ data: { boardId, userId, role: "owner" } })`。
- 出力 = `201 Board` (作成成功時は `201 Created` を返す)。
- ステータス = `201` / `401` / `422`。
- ログ = `event=board.create`、 `targetId=boardId`、 `context={ title }`。

### `PATCH /api/boards/{boardId}` 名称更新

- 入力 body = `{ title: string }`。
- 権限 = 対象ボードの `owner`。
- 処理 = `assertBoardAccess(userId, boardId, "owner")` → `Board.update({ where: { id: boardId }, data: { title } })`。
- 出力 = `200 Board`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=board.update`、 `context={ oldTitle, newTitle }`。

### `DELETE /api/boards/{boardId}` 削除

- 入力 = パスパラメータ `boardId` のみ (body なし)。
- 権限 = 対象ボードの `owner`。
- 処理 = `assertBoardAccess(userId, boardId, "owner")` → `Board.delete({ where: { id: boardId } })`。 配下 List / Card は onDelete Cascade で消える。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=board.delete`、 `context={ title }` (削除前 title を退避してログに残す)。

## UI 構造

Next.js App Router を採用し、 以下のルーティング / コンポーネント構成とする。 具体的な文言と装飾は `ui-design/` で決定する。

### ページ (Server Component)

| パス | file | 責務 |
|---|---|---|
| `/` | `app/page.tsx` | ボード一覧。 サーバーで `GET /api/boards` 相当のクエリを実行して初期描画、 新規作成 form (Client Component) を配置。 |
| `/boards/[boardId]` | `app/boards/[boardId]/page.tsx` | ボード詳細。 サーバーで Board + Lists + Cards を一括取得し、 リスト一覧 (Client Component) に渡す。 |

### 主要 Client Component

- `components/boards/BoardList.tsx` … ボード一覧の描画。
- `components/boards/BoardCreateForm.tsx` … 新規作成 form。 送信で `POST /api/boards` を叩き、 成功時に一覧を再取得する。
- `components/boards/BoardTitleEditor.tsx` … ボード詳細画面上部の title 表示 + インライン編集。 `PATCH /api/boards/{id}` を叩く。
- `components/boards/BoardDeleteButton.tsx` … 確認ダイアログ (`window.confirm` 相当) → `DELETE /api/boards/{id}` → 成功時に `router.push("/")`。

### 空状態

- 一覧が 0 件の場合、 `BoardList` 内で「新規作成の導線 + 空状態表示」 を返す。 文言は `ui-design/` 参照。

### エラー画面

- `/boards/[boardId]` のサーバー取得が 404 相当なら `notFound()` を呼び、 Next.js の `not-found.tsx` に委ねる。
- 401 の扱いは認証機構 spec 側の責務のため本設計では触れない (Route Handler 側で `401` を返すのみ)。

## 状態遷移

### エンティティ状態

Board は本 spec 範囲では単一状態 (存在する / 存在しない) のみ。 削除は物理削除。

```
[存在せず]  --POST /api/boards-->  [存在 (order=末尾)]
[存在]      --PATCH /api/boards/{id}-->  [存在 (title 更新, updatedAt 更新)]
[存在]      --DELETE /api/boards/{id}-->  [存在せず (配下 List / Card もカスケード削除)]
```

- 中間状態 (作成中 / 削除中) は持たない。 トランザクション単位でアトミックに遷移する。
- アーカイブ / 復元は本 spec 対象外 (別 spec)。

### 一覧画面の UI 状態遷移

```
initial → loading → success (items=[] なら empty)
                  ↘ error(401) → ログイン導線表示
                  ↘ error(5xx) → 「再試行」 相当の表示
```

- ハンズオン初期実装ではサーバー描画のため `initial → success` が実質デフォルト。
- 新規作成 form は `idle → submitting → idle` を保持し、 `422` 応答時は `fields` を form 側に反映する。

## 非機能の実装方針

### 性能

- `GET /api/boards` は `BoardMembership` 経由の JOIN 1 本 (`prisma.boardMembership.findMany({ where: { userId }, include: { board: true } })`)。 `boardMembership.userId` は `@@index([userId])` 済みのため 200ms 以内は容易に達成。
- 書き込み系は 1 API = 1 トランザクションに閉じる。 P95 300ms 以内は SQLite / ローカル環境で余裕を持つ。

### セキュリティ

- Route Handler 入口で必ず `getCurrentUser` を呼び、 未認証は `401` を即返す。
- 存在有無を漏らさないために `assertBoardAccess` で「未存在」 と「閲覧不可」 を両方 `404` に集約する (`spec/001_boards.md § 異常系` 備考に一致)。
- CSRF 対策は認証機構 spec 側で扱う (本設計は範囲外)。

### 運用

- 前述の `logAudit` を Route Handler の finally 相当で必ず 1 回呼ぶ。 成功時・失敗時とも記録する。
- 例外は `withApiHandler` で捕捉して `logAudit({ level: "error", errorCode: "internal_error" })` を呼ぶ。 スタックトレースは `context.stack` に格納する。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/boards` | `getCurrentUser` で `User` 取得 | 未認証で `401` |
| `GET /api/boards/{boardId}` | `assertBoardAccess(userId, boardId, "viewer")` | 未認証で `401`、 未存在 / 閲覧不可で `404` |
| `POST /api/boards` | `getCurrentUser` で `User` 取得 | 未認証で `401` |
| `PATCH /api/boards/{boardId}` | `assertBoardAccess(userId, boardId, "owner")` | 未認証で `401`、 未存在 / 閲覧不可で `404`、 `owner` 以外で `403` |
| `DELETE /api/boards/{boardId}` | `assertBoardAccess(userId, boardId, "owner")` | 未認証で `401`、 未存在 / 閲覧不可で `404`、 `owner` 以外で `403` |

`assertBoardAccess` の内部順序は「Board 存在確認 → membership 取得 → role 判定」 の 3 段。 Board が無い場合と membership が無い場合を同じ `NotFoundError` に集約する。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `board.list` 成功 | `info` | `actorId`、 `status=200`、 `context={ count }` |
| `board.get` 成功 | `info` | `actorId`、 `targetId=boardId`、 `status=200` |
| `board.create` 成功 | `info` | `actorId`、 `targetId=新規 boardId`、 `context={ title }`、 `status=201` |
| `board.update` 成功 | `info` | `actorId`、 `targetId=boardId`、 `context={ oldTitle, newTitle }`、 `status=200` |
| `board.delete` 成功 | `info` | `actorId`、 `targetId=boardId`、 `context={ title }`、 `status=204` |
| 全操作の `401` | `warn` | `actorId=null`、 `status=401`、 `errorCode="unauthorized"` |
| 全操作の `403` | `warn` | `actorId`、 `targetId`、 `status=403`、 `errorCode="forbidden"` |
| 全操作の `404` | `warn` | `actorId`、 `targetId=リクエストされた id`、 `status=404`、 `errorCode="not_found"` |
| 全操作の `422` | `warn` | `actorId`、 `status=422`、 `errorCode="validation_error"`、 `context={ fields }` |
| 全操作の `5xx` | `error` | `actorId`、 `status=500`、 `errorCode="internal_error"`、 `context={ stack }` |

## テスト方針

- テストランナー = Vitest (`constitution.md § 技術スタック`)。
- 3 層で配置する。
  - **単体テスト** … `lib/order/board.ts` 等の pure logic (末尾 order 計算、 バリデーションスキーマ)。 SQLite 不要。
  - **Route Handler テスト** … Prisma を `@vitest/spy` で mock せず、 `prisma/test.db` を持つ独立 SQLite (`DATABASE_URL=file:./prisma/test.db`) を Vitest の `beforeEach` で truncate してから叩く。 `getCurrentUser` はテスト用 fake で差し替え、 role シナリオを切り替える。
  - **画面テスト** (任意 / 教材優先度低) … `@testing-library/react` で `BoardList` / `BoardCreateForm` の主要遷移を検証する。
- テストケースの網羅方針。

| 種別 | ケース例 |
|---|---|
| 正常系 | 一覧取得 / 詳細取得 / 作成 / 名称更新 / 削除 |
| 認証 | 未ログインで各 API を叩き `401` |
| 権限 | `member` / `viewer` で `POST` / `PATCH` / `DELETE` を叩き `403` |
| 未存在 | 存在しない `boardId` で `GET` / `PATCH` / `DELETE` を叩き `404` |
| バリデーション | `title` 空文字 / 前後空白のみ / 101 文字で `422`、 各 fields に `required` / `too_long` |
| 境界 | `title` = 1 文字と 100 文字で成功、 101 文字で `422` |
| カスケード | `DELETE` 後にそのボード配下の `List` / `Card` が 0 件、 一覧 GET が `404` |
| 順序 | 3 件連続作成で `order` が 0/1/2 の順、 一覧が `order` 昇順 |

## 実装方針 (本設計で固定する判断)

- ボード新規作成時に作成者を `owner` として登録するのは `POST /api/boards` の同一トランザクション内で `BoardMembership.create` を実行する経路に固定する (`spec/001_boards.md § 未決事項` の判断)。
- 「閲覧可能ボードの取得」 は `BoardMembership` を JOIN する経路に固定する (`spec/001_boards.md § 未決事項` の判断)。 別経路 (例: 全ユーザー全ボード共有) は取らない。
- ボード並び替え API は本 spec 対象外のため実装しない。 `Board.order` は作成時の末尾追加のみで生成される。
- 削除確認は初期実装で `window.confirm` を使い、 UI ライブラリ導入 (Dialog コンポーネント) は `ui-design/` の判断に委ねる。

## 実装順序

1. **共通部品 (Prisma / auth / errors / audit)**
   `prisma/schema.prisma` を全 entity 分定義し `prisma migrate dev` を通す。 `lib/auth/currentUser.ts` はテスト差替え可能な形の stub 実装で始める。 `lib/auth/boardAccess.ts` / `lib/http/errors.ts` / `lib/log/audit.ts` を作る。
   依存 = なし。 後続の全 API がこの共通部品を使う。
2. **Board API 5 endpoint**
   `app/api/boards/route.ts` (`GET` / `POST`) → `app/api/boards/[boardId]/route.ts` (`GET` / `PATCH` / `DELETE`) の順で実装する。 各 endpoint は入口で `assertBoardAccess` を呼び、 業務処理を `try/catch` の中で 1 トランザクションに閉じる。
   依存 = 手順 1。
3. **Board 画面 (一覧 → 詳細)**
   `app/page.tsx` (一覧) → `app/boards/[boardId]/page.tsx` (詳細) → `components/boards/*` の順で作る。 詳細画面ではリスト / カード領域は空プレースホルダで置き、 List / Card の設計 (`design/002_lists.md` / `design/003_cards.md`) が実装される段階で差し替える。
   依存 = 手順 2。
4. **テスト整備**
   手順 1 の pure logic 単体テスト → 手順 2 の Route Handler テストを追加する。 SQLite テスト DB の setup helper (`tests/helpers/db.ts`) を先に作る。
   依存 = 手順 1〜3。 CI 未整備の初期実装では `npm run test` 手動実行を前提とする。
