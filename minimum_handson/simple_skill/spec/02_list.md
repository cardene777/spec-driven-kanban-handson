# ボード詳細とリスト作成の仕様

## 概要

ボード詳細画面（`app/boards/[id]/page.tsx`）でボード名・リスト一覧（order 昇順）・各リスト内のカード一覧を表示する。「リスト作成」フォームから、そのボードにリストを追加できる。

## 機能要件

### FR-001 リスト一覧取得

- 入力 board の id（GET `/api/boards/[id]/lists`）
- 条件 指定 id の Board が存在する
- 出力 200 と List 配列 `[{ id, title, order, boardId, createdAt }]`
- 振る舞い 指定ボードのリストを order 昇順で返す。0 件なら空配列。

### FR-002 ボード詳細画面の表示

- 入力 board の id（`app/boards/[id]/page.tsx` への遷移）
- 条件 指定 id の Board が存在する
- 出力 ボード詳細画面
- 振る舞い `app/boards/[id]/page.tsx` は repository から対象の Board・リスト・各リスト内のカードを取得し、ボード名、リスト一覧（order 昇順）、各リスト内のカード一覧（order 昇順）を表示する。GET API はクライアント側の一覧更新に使う。

### FR-003 リスト作成

- 入力 board の id と `{ title: string }`（POST `/api/boards/[id]/lists`）
- 条件 指定ボードが存在し、title を trim した結果が 1〜100 文字
- 出力 201 と作成された List `{ id, title, order, boardId, createdAt }`
- 振る舞い 該当ボードの既存 order の最大値 + 1 を order に設定し（0 件なら 0）、末尾に List を 1 件作成して返す。同一 board 内で order は重複させない。

### FR-004 リスト作成フォーム

- 入力 ユーザーのボタン操作とタイトル入力
- 条件 ボード詳細画面上
- 出力 作成後にリスト一覧へ反映
- 振る舞い 「リスト作成」ボタンでフォームを表示し、タイトル送信で POST を呼ぶ。成功後はリスト一覧の末尾に表示される。

## 異常系

| ID | 条件 | HTTP ステータス | レスポンス |
|---|---|---|---|
| E-001 | 指定 board の id が存在しない（一覧取得・作成とも） | 404 | `{ "error": { "code": "NOT_FOUND", "message": "指定されたボードが見つかりません" } }` |
| E-002 | 対象ボードは存在し、title trim 後 0 文字 | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜100文字で入力してください" } }` |
| E-003 | 対象ボードは存在し、title trim 後 101 文字以上 | 400 | 同上 |

判定順序は 00_common.md に従い、対象ボードが存在しない場合は 404 を先に返す（body に不正な title が含まれていても 400 を返さない）。

## 境界条件

- title trim 後 0 / 1 / 100 / 101 文字 → エラー / 成功 / 成功 / エラー
- 半角・全角空白、タブ、改行のみ → trim 後 0 文字 → エラー
- リスト 0 件のボード → 一覧は空配列、画面は空状態
- 存在しない boardId → 404

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| title | はい | 文字列。trim（前後の半角・全角空白、タブ、改行を除去）後 1〜100 文字 |
| boardId（パス） | はい | 既存の Board.id |

## 並び順

- 同一 board 内の List は order の昇順で表示する。
- 新規作成時の order は「同一 board 内の既存最大 order + 1」（0 件なら 0）。
- 同一 board 内で order を重複させない。

## 参考

- spec/00_common.md
- spec/01_board.md
- constitution.md 「入力エラーと境界値」
