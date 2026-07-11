# ボード詳細とリスト作成の仕様

## 概要

ボード詳細画面 (`app/boards/[id]/page.tsx`) でボード名 / リスト一覧 / 各リストのカード一覧を表示し、「リスト作成」 ボタンから新規リストを追加できるようにする。同一ボード内のリストは order 昇順で並ぶ。

## 機能要件

### FR-001 ボード詳細画面の表示

- 入力 `/boards/[id]` へのアクセス (id は Board.id)
- 条件 指定 id の Board が存在するとき
- 出力 ボード名 / リスト一覧 (order 昇順) / 各リスト内カード一覧 (order 昇順) を表示
- 振る舞い 画面ロード時に必要データを取得する。リスト表示 UI はカンバン形式 (横並び) を想定するが、レイアウトは実装層で決めてよい。存在しない id の場合は 404 相当の表示 (Next.js の `notFound()` 等) を返す。

### FR-002 ボード配下リスト一覧の取得

- 入力 GET `/api/boards/[id]/lists`
- 条件 指定 id の Board が存在するとき
- 出力 200 OK / `{ "lists": [{ "id": string, "title": string, "order": number, "boardId": string, "createdAt": string }, ...] }`
- 振る舞い 指定ボードに属するリストを order 昇順で返す。0 件時は `{ "lists": [] }`。

### FR-003 リスト作成フォームの表示

- 入力 「リスト作成」 ボタンのクリック
- 条件 ボード詳細画面が表示されているとき
- 出力 タイトル入力用のフォームが表示される
- 振る舞い フォームには title 入力欄と送信ボタン、キャンセル手段を持つ。

### FR-004 リストの作成

- 入力 POST `/api/boards/[id]/lists` / body `{ "title": string }`
- 条件 指定 Board が存在 かつ title が trim 後 1〜100 文字
- 出力 201 Created / `{ "list": { "id": string, "title": string, "order": number, "boardId": string, "createdAt": string } }`
- 振る舞い 同一 boardId 配下の既存 order 最大値 + 1 を採番して INSERT する (0 件なら 0)。作成後、詳細画面は新規リストが末尾に見える状態に更新する。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-001 | 存在しない boardId で GET / POST | 404 | `{ "error": { "code": "NOT_FOUND", "message": "指定されたボードが見つかりません" } }` |
| E-002 | title フィールド欠落 (POST) | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜100文字で入力してください" } }` |
| E-003 | title が trim 後 0 文字 (POST) | 400 | 同上 |
| E-004 | title が 101 文字以上 (POST) | 400 | 同上 |
| E-005 | title が文字列でない (POST) | 400 | 同上 |
| E-006 | DB 接続失敗などサーバー内部エラー | 500 | `{ "error": { "code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました" } }` |

## 境界条件

- title 0 文字 (trim 後) → 400
- title 1 文字 → 201
- title 100 文字 → 201
- title 101 文字 → 400
- 存在しない boardId → GET / POST いずれも 404
- 同一ボード内リスト 0 件時の一覧 → 200 / `{ "lists": [] }`
- 同一ボード内で連続してリストを N 件作成 → order は 0, 1, 2, ..., N-1 と単調増加
- 同一 title のリスト複数作成 → 許可 (id で区別)
- バリデーションエラーと 404 が同時発生し得るケース (存在しない boardId + 空 title) → 404 を優先 (親不在を先に返す)

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| boardId (URL パス) | はい | 存在する Board.id と一致すること |
| title | はい | 文字列、trim 後 1〜100 文字 |

## 参考

- constitution.md § 仕様駆動 / 異常系の網羅
- 005_shared_rules.md § FR-002 trim / FR-003 404 定義 / FR-004 order 採番 / FR-005 データモデル
- 001_boards.md (親リソース Board)
- 003_cards.md (子リソース Card)
