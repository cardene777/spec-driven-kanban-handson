# ボード一覧とボード作成の仕様

## 概要

ボードの一覧表示と新規ボード作成を担う。トップ画面 (`app/page.tsx`) にボードを createdAt 降順のカード形式で並べ、各カードから詳細画面 (`/boards/[id]`) へ遷移できるようにする。「新規ボード作成」 ボタンからフォームでタイトルを入力してボードを作成する。

## 機能要件

### FR-001 ボード一覧の取得

- 入力 GET `/api/boards`
- 条件 常時
- 出力 200 OK / `{ "boards": [{ "id": string, "title": string, "createdAt": string }, ...] }`
- 振る舞い DB に保存された全ボードを createdAt 降順で返す。0 件時は `{ "boards": [] }`。

### FR-002 ボード一覧画面の表示

- 入力 `app/page.tsx` にアクセス
- 条件 GET `/api/boards` が 200 を返したとき
- 出力 ボードを createdAt 降順のカード形式でグリッド表示
- 振る舞い 各カードは `title` を表示し、クリックで `/boards/[id]` へ遷移する。0 件時は「まだボードがありません」等の空状態メッセージを表示する。

### FR-003 新規ボード作成フォームの表示

- 入力 「新規ボード作成」 ボタンのクリック
- 条件 一覧画面上でボタンが押されたとき
- 出力 タイトル入力用のフォームが表示される
- 振る舞い フォームには title 入力欄と送信ボタンを持つ。キャンセル手段 (フォームを閉じる) を用意する。

### FR-004 ボードの作成

- 入力 POST `/api/boards` / body `{ "title": string }`
- 条件 title が trim 後 1〜100 文字のとき
- 出力 201 Created / `{ "board": { "id": string, "title": string, "createdAt": string } }`
- 振る舞い trim 後のタイトルで Board を DB に INSERT し、作成したレコードを返す。作成後、一覧画面は新規ボードが先頭に見える状態に更新する (再フェッチ or optimistic update)。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-001 | title フィールド欠落 | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜100文字で入力してください" } }` |
| E-002 | title が trim 後 0 文字 (空文字 / 空白のみ) | 400 | 同上 |
| E-003 | title が 101 文字以上 | 400 | 同上 |
| E-004 | title が文字列でない (数値 / null / 配列) | 400 | 同上 |
| E-005 | DB 接続失敗などサーバー内部エラー | 500 | `{ "error": { "code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました" } }` |

## 境界条件

- title 0 文字 (trim 後) → 400
- title 1 文字 → 201
- title 100 文字 → 201
- title 101 文字 → 400
- title `"   "` (半角空白 3 文字) → trim 後 0 文字で 400
- title `"  hello  "` → trim 後 `"hello"` (5 文字) で 201、保存値も `"hello"`
- ボード 0 件時の一覧 → 200 / `{ "boards": [] }`
- 同一 title のボード複数作成 → 許可 (id で区別、重複エラーなし)

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| title | はい | 文字列、trim 後 1〜100 文字 |

## 参考

- constitution.md § 仕様駆動 / 異常系の網羅
- 005_shared_rules.md § FR-001 エラーレスポンス形式 / FR-002 trim 挙動 / FR-005 データモデル
- 002_lists.md (詳細画面から遷移するリスト機能)
