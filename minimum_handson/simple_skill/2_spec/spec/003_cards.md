# カード追加と表示の仕様

## 概要

ボード詳細画面の各リスト末尾に「カード追加」 ボタンを置き、押すとタイトル入力フォームが開きカードを新規追加できるようにする。同一リスト内のカードは order 昇順で並び、追加後は末尾に見える。カード編集 (インライン編集) は 004_card_edit.md に分離する。

## 機能要件

### FR-001 リスト配下カード一覧の取得

- 入力 GET `/api/lists/[id]/cards`
- 条件 指定 id の List が存在するとき
- 出力 200 OK / `{ "cards": [{ "id": string, "title": string, "description": string | null, "order": number, "listId": string, "createdAt": string }, ...] }`
- 振る舞い 指定リストに属するカードを order 昇順で返す。0 件時は `{ "cards": [] }`。

### FR-002 リスト内カード一覧の表示

- 入力 ボード詳細画面のロード
- 条件 対象リストが存在するとき
- 出力 各リスト内にカードを order 昇順で縦並び表示
- 振る舞い 各カードは title を表示する。description は本 spec ではリスト表示に含めなくてよい (API では返す)。

### FR-003 「カード追加」 ボタンとフォームの表示

- 入力 リスト末尾の「カード追加」 ボタンのクリック
- 条件 ボード詳細画面が表示されているとき
- 出力 対象リストの末尾にタイトル入力用フォームが表示される
- 振る舞い フォームには title 入力欄と送信ボタン、キャンセル手段を持つ。description 入力欄は本 spec では設けない (未指定で作成)。

### FR-004 カードの作成

- 入力 POST `/api/lists/[id]/cards` / body `{ "title": string }`
- 条件 指定 List が存在 かつ title が trim 後 1〜200 文字
- 出力 201 Created / `{ "card": { "id": string, "title": string, "description": null, "order": number, "listId": string, "createdAt": string } }`
- 振る舞い 同一 listId 配下の既存 order 最大値 + 1 を採番して INSERT する (0 件なら 0)。description は null で保存。作成後、詳細画面は新規カードが該当リストの末尾に見える状態に更新する。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-001 | 存在しない listId で GET / POST | 404 | `{ "error": { "code": "NOT_FOUND", "message": "指定されたリストが見つかりません" } }` |
| E-002 | title フィールド欠落 (POST) | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "titleは1〜200文字で入力してください" } }` |
| E-003 | title が trim 後 0 文字 (POST) | 400 | 同上 |
| E-004 | title が 201 文字以上 (POST) | 400 | 同上 |
| E-005 | title が文字列でない (POST) | 400 | 同上 |
| E-006 | DB 接続失敗などサーバー内部エラー | 500 | `{ "error": { "code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました" } }` |

## 境界条件

- title 0 文字 (trim 後) → 400
- title 1 文字 → 201
- title 200 文字 → 201
- title 201 文字 → 400
- 存在しない listId → GET / POST いずれも 404
- 同一リスト内カード 0 件時の一覧 → 200 / `{ "cards": [] }`
- 同一リスト内で連続してカードを N 件作成 → order は 0, 1, 2, ..., N-1 と単調増加
- 同一 title のカード複数作成 → 許可 (id で区別)
- バリデーションエラーと 404 が同時発生し得るケース (存在しない listId + 空 title) → 404 を優先

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| listId (URL パス) | はい | 存在する List.id と一致すること |
| title | はい | 文字列、trim 後 1〜200 文字 |
| description | いいえ | 本 spec の POST では受け取らない (null 固定) |

## 参考

- constitution.md § 仕様駆動 / 異常系の網羅
- 005_shared_rules.md § FR-002 trim / FR-003 404 定義 / FR-004 order 採番 / FR-005 データモデル
- 002_lists.md (親リソース List)
- 004_card_edit.md (カードタイトルのインライン編集)
