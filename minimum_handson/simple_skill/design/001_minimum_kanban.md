# 最小構成のカンバンアプリの設計

## 参照する仕様

- spec/00_common.md（共通規約）
- spec/01_board.md（ボード一覧・作成）
- spec/02_list.md（ボード詳細・リスト作成）
- spec/03_card.md（カード追加・表示）
- spec/04_card_edit.md（カードタイトル編集）

## データモデル

| モデル | フィールド | 関係 | 並び順 |
|---|---|---|---|
| Board | id (cuid), title (1〜100), createdAt | List を 1..N 所有 | 一覧は createdAt 降順 |
| List | id (cuid), title (1〜100), order (Int), boardId, createdAt | 1 Board に属し、Card を 1..N 所有 | 同一 board 内で order 昇順、重複禁止 |
| Card | id (cuid), title (1〜200), description (String?), order (Int), listId, createdAt | 1 List に属する | 同一 list 内で order 昇順、重複禁止 |

Prisma スキーマは `prisma-client` generator と `output = "../generated/prisma"` を使う。`lib/prisma.ts` で `PrismaBetterSqlite3` adapter を渡して生成済み Client を初期化する。

## API 設計

| メソッド | パス | 入力 | 成功時 | 異常系 |
|---|---|---|---|---|
| GET | `/api/boards` | なし | 200 / `Board[]`（createdAt 降順） | INTERNAL_ERROR 500 |
| POST | `/api/boards` | `{ title }` | 201 / `Board` | VALIDATION_ERROR 400 |
| GET | `/api/boards/[id]/lists` | boardId | 200 / `List[]`（order 昇順） | NOT_FOUND 404（board 不在） |
| POST | `/api/boards/[id]/lists` | boardId + `{ title }` | 201 / `List` | 404（board 不在） → 400（title 違反） |
| GET | `/api/lists/[id]/cards` | listId | 200 / `Card[]`（order 昇順） | NOT_FOUND 404（list 不在） |
| POST | `/api/lists/[id]/cards` | listId + `{ title }` | 201 / `Card` | 404（list 不在） → 400（title 違反） |
| PATCH | `/api/cards/[id]` | cardId + `{ title }` | 200 / `Card` | 404（card 不在） → 400（title 違反） |

エラー JSON は `{ "error": { "code": "...", "message": "..." } }`。判定順序は「対象／親の存在確認（404）→ 入力検証（400）」の順。

## 画面構成

| 画面 | パス | 表示するもの | 操作 |
|---|---|---|---|
| ボード一覧 | `/`（`app/page.tsx`） | Board カードを createdAt 降順で表示（0 件は空状態） | 「新規ボード作成」フォームで POST `/api/boards`、カードクリックで `/boards/[id]` |
| ボード詳細 | `/boards/[id]`（`app/boards/[id]/page.tsx`） | ボード名、List を order 昇順で横並び、各 List 内の Card を order 昇順で縦並び | 「リスト作成」で POST、リスト内「カード追加」で POST、カードタイトルクリック→ blur で PATCH |

`app/boards/[id]/page.tsx` は repository から対象 Board・List・Card を取得する Server Component。GET API はクライアント側の一覧更新に使う。

## バリデーション

| 対象 | 制約 | 失敗時 |
|---|---|---|
| Board.title | trim（半角・全角空白、タブ、改行）後 1〜100 文字 | VALIDATION_ERROR 400、`titleは1〜100文字で入力してください` |
| List.title | trim 後 1〜100 文字 | VALIDATION_ERROR 400、`titleは1〜100文字で入力してください` |
| Card.title | trim 後 1〜200 文字 | VALIDATION_ERROR 400、`titleは1〜200文字で入力してください` |

`lib/validation/title.ts` に trim + 長さ検証の共有関数を集約し、Board・List・Card で上限だけ差し替える。

## データ取得と並び順

- `app/page.tsx` は `boardRepository.list()` から `Board[]` を createdAt 降順で取得する。
- `app/boards/[id]/page.tsx` は repository から対象 Board、List（order 昇順）、各 List 内の Card（order 昇順）を取得する。存在しない board は 404 ページに委ねる。
- List と Card は「親内 0 件なら `order = 0`、以後は最大値 + 1」で採番し、同じ親内で重複させない。
- 対象リソースが無い場合は 404 を先に返し、対象がある場合だけ入力を検証して 400 を返す。

## 実装順序

1. Prisma スキーマ（Board / List / Card）
2. adapter 経由の `lib/prisma.ts`、`prisma.config.ts`
3. バリデーション（`lib/validation/title.ts`）
4. リポジトリ層（`lib/repository/{board,list,card}.ts`）
5. API ルート（`app/api/boards`, `.../lists`, `.../cards`, `app/api/cards/[id]`）
6. 画面（`app/page.tsx`, `app/boards/[id]/page.tsx` と `_components/`）
7. Vitest 設定と `tests/api/kanban.test.ts`
8. lint / typecheck / test / build

## 未決事項

- なし
