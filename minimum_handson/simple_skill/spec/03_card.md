# カード追加と表示の仕様

## 概要

各リスト内にカードを order 昇順で表示し、リスト末尾の「カード追加」フォームからタイトルを入力してカードを作成できる。作成後はリスト末尾に表示される。

## 機能要件

### FR-001 カード一覧取得

- 入力 list の id（GET /api/lists/[id]/cards）
- 条件 指定 id の List が存在する
- 出力 200 と Card 配列 `[{ id, title, description, order, listId, createdAt }]`
- 振る舞い 指定リストのカードを order の昇順で返す。0件なら空配列。

### FR-002 リスト内カードの表示

- 入力 list の id（ボード詳細画面内）
- 条件 指定リストが存在する
- 出力 リスト内のカード一覧
- 振る舞い カードを order 昇順で表示する。0件のリストはカードなしで表示する。

### FR-003 カード作成

- 入力 list の id と `{ title: string }`（POST /api/lists/[id]/cards）
- 条件 指定リストが存在し、title が trim 後 1〜200文字
- 出力 201 と作成された Card `{ id, title, description, order, listId, createdAt }`
- 振る舞い order に「そのリストの既存カード数」を設定し、description は null で、末尾にカードを1件作成して返す。

### FR-004 カード追加フォーム

- 入力 ユーザーのボタン操作とタイトル入力
- 条件 リスト末尾
- 出力 作成後にカード一覧へ反映
- 振る舞い リスト末尾の「カード追加」ボタンでフォームを表示し、タイトル送信で POST を呼ぶ。成功後はそのリストの末尾にカードが表示される。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-001 | title が trim 後 0文字 | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜200文字で入力してください" } }` |
| E-002 | title が trim 後 201文字以上 | 400 | 同上 |
| E-003 | 指定 list の id が存在しない（一覧取得・作成とも） | 404 | `{ "error": { "code": "NOT_FOUND", "message": "指定されたリストが見つかりません" } }` |

## 境界条件

- title trim後 0 / 1 / 200 / 201文字 → エラー / 成功 / 成功 / エラー
- 空白のみ → trim後0文字 → エラー
- カード0件のリスト → 一覧は空配列
- 存在しない listId → 404

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| title | はい | 文字列、trim後1〜200文字 |
| listId（パス） | はい | 既存の List.id |

## 参考

- spec/00_common.md
- spec/02_list.md
- constitution.md 「異常系の網羅」
