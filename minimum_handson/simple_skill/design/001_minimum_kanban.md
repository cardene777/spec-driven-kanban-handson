# 最小構成のカンバンアプリの設計

## 参照する仕様

- spec/00_common.md 共通ルール
- spec/01_board.md ボード
- spec/02_list.md リスト
- spec/03_card.md カード
- spec/04_card_edit.md カードタイトル編集

## データモデル

| モデル | フィールド | 関係 | 並び順 |
|---|---|---|---|
| Board | `id` (String, cuid, PK), `title` (String), `createdAt` (DateTime, default now) | `lists: List[]` | 一覧は `createdAt` 降順 |
| List | `id` (String, cuid, PK), `title` (String), `order` (Int), `boardId` (String, FK→Board), `createdAt` (DateTime) | `board: Board`, `cards: Card[]` | 同じ `boardId` 内で `order` 昇順・重複なし |
| Card | `id` (String, cuid, PK), `title` (String), `description` (String?, nullable), `order` (Int), `listId` (String, FK→List), `createdAt` (DateTime) | `list: List` | 同じ `listId` 内で `order` 昇順・重複なし |

- 関係: Board 1 — N List、List 1 — N Card
- `description` のみ nullable。他は必須。

## API 設計

| メソッド | パス | 入力 | 成功時 | 異常系 |
|---|---|---|---|---|
| GET | `/api/boards` | なし | 200 `Board[]`（`createdAt` 降順） | なし |
| POST | `/api/boards` | `{ title }` | 201 作成された `Board` | 400 VALIDATION_ERROR（空 / 100文字超） |
| GET | `/api/boards/[id]/lists` | パス `id` | 200 `List[]`（`order` 昇順） | 404 NOT_FOUND（ボード無し） |
| POST | `/api/boards/[id]/lists` | パス `id`, `{ title }` | 201 作成された `List` | 404 NOT_FOUND（ボード無し・最優先）／ 400 VALIDATION_ERROR（空 / 100文字超） |
| GET | `/api/lists/[id]/cards` | パス `id` | 200 `Card[]`（`order` 昇順） | 404 NOT_FOUND（リスト無し） |
| POST | `/api/lists/[id]/cards` | パス `id`, `{ title }` | 201 作成された `Card` | 404 NOT_FOUND（リスト無し・最優先）／ 400 VALIDATION_ERROR（空 / 200文字超） |
| PATCH | `/api/cards/[id]` | パス `id`, `{ title }` | 200 更新された `Card` | 404 NOT_FOUND（カード無し・最優先）／ 400 VALIDATION_ERROR（空 / 200文字超） |

- エラー応答は全て `{ "error": { "code": "...", "message": "..." } }`。
- `code` は `VALIDATION_ERROR`（400）/ `NOT_FOUND`（404）。

## 画面構成

| 画面 | パス | 表示するもの | 操作 |
|---|---|---|---|
| ボード一覧 | `app/page.tsx` | 作成済みボードをカード形式で `createdAt` 降順表示 | 「新規ボード作成」ボタン→フォーム→作成。各ボードカードから `/boards/[id]` へ遷移 |
| ボード詳細 | `app/boards/[id]/page.tsx` | ボード名、リスト一覧（`order` 昇順）、各リスト内のカード一覧（`order` 昇順） | 「リスト作成」→フォーム→作成。各リスト末尾「カード追加」→フォーム→作成。カードタイトルをクリック→インライン編集→blur で自動保存 |

- ボード詳細画面は Server Component として repository から対象ボード・リスト・カードを取得して初期描画する。
- 作成後の一覧更新は Client Component が GET API を呼んで再取得する。

## バリデーション

| 対象 | 制約 | 失敗時 |
|---|---|---|
| Board.title | 前後の半角・全角空白・タブ・改行を除去 → 1〜100文字。トリム後を保存 | 400 VALIDATION_ERROR |
| List.title | 同上 1〜100文字 | 400 VALIDATION_ERROR |
| Card.title | 同上 1〜200文字 | 400 VALIDATION_ERROR |

- トリム検証は `lib/validation/title.ts` の共有関数に集約し、上限（100 / 200）だけを差し替える。
- 全角空白（U+3000）を含む空白・タブ・改行を除去する正規表現を用いる。

## データ取得と並び順

- `app/boards/[id]/page.tsx` は repository から対象ボード・リスト・カードを取得する。
- リストとカードは親内に0件なら `order=0`、以後は最大値+1を割り当て、同じ親内で重複させない。
- 採番は「作成時に同じ親内の `max(order)` を取得して +1（0件なら0）」で行う。
- 対象リソースが無い場合は 404 を先に返し、対象がある場合だけ入力を検証して 400 を返す。

## 実装順序

1. プロジェクト初期化（Next.js 15 + TypeScript + Tailwind、Prisma 6、Vitest 2）
2. Prisma スキーマ（Board / List / Card）とマイグレーション、`lib/prisma.ts`
3. バリデーション（`lib/validation/title.ts`）、エラー（`lib/errors.ts`）
4. repository（`lib/repository/board.ts` / `list.ts` / `card.ts`）
5. API（boards / lists / cards / cards/[id]）
6. 画面（ボード一覧、ボード詳細、`_components/`）
7. 最小テスト（`tests/api/kanban.test.ts`）

## 未決事項

- なし
