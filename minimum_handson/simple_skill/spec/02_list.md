# ボード詳細とリスト作成の仕様

## 概要

ボード詳細画面（app/boards/[id]/page.tsx）でボード名・リスト一覧（order昇順）・各リスト内のカード一覧を表示する。「リスト作成」フォームから、そのボードにリストを追加できる。

## 機能要件

### FR-001 リスト一覧取得

- 入力 board の id（GET /api/boards/[id]/lists）
- 条件 指定 id の Board が存在する
- 出力 200 と List 配列 `[{ id, title, order, boardId, createdAt }]`
- 振る舞い 指定ボードのリストを order の昇順で返す。0件なら空配列。

### FR-002 ボード詳細画面の表示

- 入力 board の id（app/boards/[id]/page.tsx への遷移）
- 条件 指定 id の Board が存在する
- 出力 ボード詳細画面
- 振る舞い ボード名、リスト一覧（order昇順）、各リスト内のカード一覧（order昇順）を表示する。

### FR-003 リスト作成

- 入力 board の id と `{ title: string }`（POST /api/boards/[id]/lists）
- 条件 指定ボードが存在し、title が trim 後 1〜100文字
- 出力 201 と作成された List `{ id, title, order, boardId, createdAt }`
- 振る舞い order に「そのボードの既存リスト数」を設定し、末尾にリストを1件作成して返す。

### FR-004 リスト作成フォーム

- 入力 ユーザーのボタン操作とタイトル入力
- 条件 ボード詳細画面上
- 出力 作成後にリスト一覧へ反映
- 振る舞い 「リスト作成」ボタンでフォームを表示し、タイトル送信で POST を呼ぶ。成功後はリスト一覧の末尾に表示される。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-001 | title が trim 後 0文字 | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜100文字で入力してください" } }` |
| E-002 | title が trim 後 101文字以上 | 400 | 同上 |
| E-003 | 指定 board の id が存在しない（一覧取得・作成とも） | 404 | `{ "error": { "code": "NOT_FOUND", "message": "指定されたボードが見つかりません" } }` |

## 境界条件

- title trim後 0 / 1 / 100 / 101文字 → エラー / 成功 / 成功 / エラー
- 空白のみ → trim後0文字 → エラー
- リスト0件のボード → 一覧は空配列、画面は空状態
- 存在しない boardId → 404

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| title | はい | 文字列、trim後1〜100文字 |
| boardId（パス） | はい | 既存の Board.id |

## 参考

- spec/00_common.md
- spec/01_board.md
- constitution.md 「異常系の網羅」
