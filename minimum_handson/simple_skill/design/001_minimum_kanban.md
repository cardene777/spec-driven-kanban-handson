# 最小カンバンの設計

## 参照する仕様

- constitution.md
- spec/001_boards.md
- spec/002_lists.md
- spec/003_cards.md
- spec/004_card_edit.md
- spec/005_shared_rules.md

## データモデル

| モデル | フィールド | 関係 | 並び順 |
|---|---|---|---|
| Board | `id` string (cuid, PK) / `title` string (trim 後 1〜100 文字) / `createdAt` datetime (default now()) | Board 1 : N List (List.boardId が FK、Board 削除で cascade) | 一覧は `createdAt` 降順 |
| List | `id` string (cuid, PK) / `title` string (trim 後 1〜100 文字) / `order` int / `boardId` string (FK → Board.id) / `createdAt` datetime (default now()) | List N : 1 Board / List 1 : N Card (Card.listId が FK、List 削除で cascade) | 同一 `boardId` 内で `order` 昇順 |
| Card | `id` string (cuid, PK) / `title` string (trim 後 1〜200 文字) / `description` string? (null 許容、長さ制約なし) / `order` int / `listId` string (FK → List.id) / `createdAt` datetime (default now()) | Card N : 1 List | 同一 `listId` 内で `order` 昇順 |

補足。

- `order` は同一親配下の既存最大値 + 1 を採番、0 件なら 0 (共通ルール FR-004)
- `createdAt` は API レスポンスで ISO 8601 UTC 文字列として返す (共通ルール FR-006)
- 削除機能は本設計の範囲外だが、Prisma schema には親削除時の cascade を宣言しておく

## API設計

| メソッド | パス | 入力 | 成功時 | 異常系 |
|---|---|---|---|---|
| GET | `/api/boards` | なし | 200 OK / `{ "boards": [{ id, title, createdAt }, ...] }` (`createdAt` 降順、0 件時 `[]`) | 500 `INTERNAL_ERROR` |
| POST | `/api/boards` | `{ "title": string }` | 201 Created / `{ "board": { id, title, createdAt } }` (trim 後の値で保存) | 400 `VALIDATION_ERROR` (title 欠落 / 型不正 / trim 後 0 文字 / 101 文字以上) / 500 `INTERNAL_ERROR` |
| GET | `/api/boards/[id]/lists` | パス `id` = boardId | 200 OK / `{ "lists": [{ id, title, order, boardId, createdAt }, ...] }` (`order` 昇順、0 件時 `[]`) | 404 `NOT_FOUND` (board 不在) / 500 `INTERNAL_ERROR` |
| POST | `/api/boards/[id]/lists` | パス `id` = boardId / body `{ "title": string }` | 201 Created / `{ "list": { id, title, order, boardId, createdAt } }` (order は既存最大 + 1、0 件なら 0) | 404 `NOT_FOUND` (board 不在) / 400 `VALIDATION_ERROR` (title 不正) / 500 `INTERNAL_ERROR` (404 と 400 同時成立時は 404 を優先) |
| GET | `/api/lists/[id]/cards` | パス `id` = listId | 200 OK / `{ "cards": [{ id, title, description, order, listId, createdAt }, ...] }` (`order` 昇順、0 件時 `[]`) | 404 `NOT_FOUND` (list 不在) / 500 `INTERNAL_ERROR` |
| POST | `/api/lists/[id]/cards` | パス `id` = listId / body `{ "title": string }` | 201 Created / `{ "card": { id, title, description: null, order, listId, createdAt } }` (description は null 固定、order は既存最大 + 1) | 404 `NOT_FOUND` (list 不在) / 400 `VALIDATION_ERROR` (title 不正) / 500 `INTERNAL_ERROR` (404 と 400 同時成立時は 404 を優先) |
| PATCH | `/api/cards/[id]` | パス `id` = cardId / body `{ "title": string }` | 200 OK / `{ "card": { id, title, description, order, listId, createdAt } }` (title のみ更新、`description` / `order` / `listId` は body に含まれても無視) | 404 `NOT_FOUND` (card 不在) / 400 `VALIDATION_ERROR` (title 不正) / 500 `INTERNAL_ERROR` (404 と 400 同時成立時は 404 を優先) |

補足。

- エラーレスポンスは全 API で `{ "error": { "code": "<CODE>", "message": "<日本語>" } }` に統一する (共通ルール FR-001)
- エラーコードは `VALIDATION_ERROR` / `NOT_FOUND` / `INTERNAL_ERROR` の 3 種のみ使用する
- title のバリデーションメッセージは Board / List が「titleは1〜100文字で入力してください」、Card が「titleは1〜200文字で入力してください」
- 親不在の 404 メッセージは boardId 不在で「指定されたボードが見つかりません」、listId 不在で「指定されたリストが見つかりません」、cardId 不在で「指定されたカードが見つかりません」
- 500 メッセージは「サーバーエラーが発生しました」で統一
- 全リソースで同一 title の複数作成を許可する (id で区別、重複エラーなし)

## 画面構成

| 画面 | パス | 表示するもの | 操作 |
|---|---|---|---|
| ボード一覧 | `/` (`app/page.tsx`) | ボードカードを `createdAt` 降順のグリッドで並べる。各カードは `title` を表示。0 件時は「まだボードがありません」 等の空状態メッセージ。画面上に「新規ボード作成」 ボタン。 | ボードカードクリックで `/boards/[id]` へ遷移。「新規ボード作成」 クリックで title 入力フォームを開き、送信で `POST /api/boards` を呼び、成功時は一覧を再フェッチ (または optimistic update) して新規ボードを先頭に反映、キャンセルでフォームを閉じる。 |
| ボード詳細 | `/boards/[id]` (`app/boards/[id]/page.tsx`) | ボード名。リスト一覧を `order` 昇順で横並びカンバン形式に表示。各リスト内にカード一覧を `order` 昇順で縦並びに表示 (カードは `title` のみ、`description` は非表示)。各リストの末尾に「カード追加」 ボタン。画面上に「リスト作成」 ボタン。存在しない `id` は Next.js の `notFound()` で 404 相当を返す。 | 「リスト作成」 クリックで title 入力フォームを開き、送信で `POST /api/boards/[id]/lists` を呼び、成功時は新規リストが末尾に見える状態へ更新、キャンセルでフォームを閉じる。「カード追加」 クリックで対象リスト末尾に title 入力フォームを開き、送信で `POST /api/lists/[id]/cards` を呼び、成功時は新規カードが該当リストの末尾に見える状態へ更新、キャンセルでフォームを閉じる。カードの title クリックでインライン編集モードへ切替、フォーカスは編集要素へ移り初期値は現在の title、blur で trim 後の値を `PATCH /api/cards/[id]` へ送信 (元の title と同一なら API を呼ばず閲覧モードへ戻す)、成功時は最新値を反映、失敗時は元の値に戻し画面上でエラーを示す。 |

補足。

- 画面ロード時のデータ取得は各 GET API を呼ぶ (実装層の詳細で server component / client fetch のどちらでも可)
- 同一画面上で複数カードを同時に編集モードにしてよい (制約なし、共通ルール FR-002 に該当なし)
- 同一カードの再クリックによる編集モード再突入は冪等 (すでに編集モードなら何もしない)
- 詳細画面のレイアウト (カンバン横並びの CSS / grid の具体) は実装層で決めてよい

## バリデーション

| 対象 | 制約 | 失敗時 |
|---|---|---|
| Board.title | 文字列であり、trim 後 1〜100 文字 | 400 / `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜100文字で入力してください" } }` |
| List.title | 文字列であり、trim 後 1〜100 文字 | 400 / `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜100文字で入力してください" } }` |
| Card.title (作成 / 更新) | 文字列であり、trim 後 1〜200 文字 | 400 / `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜200文字で入力してください" } }` |
| boardId (URL パス) | 存在する Board.id と一致する | 404 / `{ "error": { "code": "NOT_FOUND", "message": "指定されたボードが見つかりません" } }` |
| listId (URL パス) | 存在する List.id と一致する | 404 / `{ "error": { "code": "NOT_FOUND", "message": "指定されたリストが見つかりません" } }` |
| cardId (URL パス) | 存在する Card.id と一致する | 404 / `{ "error": { "code": "NOT_FOUND", "message": "指定されたカードが見つかりません" } }` |
| 親不在と title 不正の同時発生 | 404 を優先し親不在エラーだけを返す (title バリデーションは実行しない) | 404 (該当メッセージ) |
| trim 対象文字 | 前後の半角スペース / 全角スペース / タブ / 改行を除去 | trim 後 0 文字なら 400 |
| Card 更新の body 追加フィールド | `description` / `order` / `listId` は body に含まれていても無視、`title` のみ更新 | エラーにしない (無視) |
| インライン編集で編集後の値が元と同一 | API を呼ばず閲覧モードへ戻してよい (最適化として許容) | エラーにしない |
| DB 接続失敗などサーバー内部エラー | 500 / `{ "error": { "code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました" } }` | 500 |

補足。

- バリデーション実装は API 層に置く (constitution § 異常系の網羅)
- trim → 型検査 → 長さ検査の順で判定し、いずれか失敗で `VALIDATION_ERROR` を返す
- 親不在 (404) 判定はバリデーションより先に行う

## 実装順序

1. Prisma スキーマ (`prisma/schema.prisma`) で Board / List / Card を定義し、SQLite にマイグレーションする
2. `lib/` にバリデーションヘルパー (trim + 長さ検査) とエラーレスポンス生成ヘルパー (`VALIDATION_ERROR` / `NOT_FOUND` / `INTERNAL_ERROR`) を作る
3. API を boards → lists → cards の順に、各リソースで GET → POST (→ PATCH) の順に実装する (order 採番、404 優先ロジックを含む)
4. 画面を一覧 → 詳細 → 作成フォーム (ボード / リスト / カード) → カードタイトルのインライン編集の順に実装する
5. Vitest で最小テストを追加する (title バリデーション境界値 / 親不在の 404 優先 / order 採番の単調増加 / PATCH で title 以外の body 無視)

## 未決事項

- なし
