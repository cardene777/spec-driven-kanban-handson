# 共通ルールの仕様

## 概要

ボード / リスト / カード の 3 リソース全体で共通する規約 (エラーレスポンス形式 / trim 挙動 / 404 定義 / order 採番 / データモデル) をここに集約する。
機能仕様 (001〜004) は本ファイルの規約を前提とし、機能固有の差分だけを記述する。

## 機能要件

### FR-001 エラーレスポンス形式の統一

- 入力 API 呼び出しでバリデーション失敗 / リソース不在 / サーバー内部エラーが発生したとき
- 条件 HTTP ステータスが 4xx または 5xx になるとき
- 出力 body は次の JSON 形式で統一する
  ```json
  { "error": { "code": "<エラーコード>", "message": "<日本語メッセージ>" } }
  ```
- 振る舞い 正常系レスポンスは本形式を含まない。エラーコードは以下 3 種のみ使用する。
  - `VALIDATION_ERROR` (400 バリデーション違反)
  - `NOT_FOUND` (404 リソース不在)
  - `INTERNAL_ERROR` (500 サーバー内部エラー)

### FR-002 タイトルの trim 挙動

- 入力 API に渡された title 文字列
- 条件 全てのタイトル入力 (Board / List / Card)
- 出力 trim 後の文字列を保存 / バリデーションする
- 振る舞い 前後の空白 (半角スペース / 全角スペース / タブ / 改行) を除去してから文字数を検証する。trim 結果が 0 文字なら `VALIDATION_ERROR` (400)。DB 保存値も trim 後の文字列とする。

### FR-003 リソース不在の 404 定義

- 入力 URL パスに含まれる ID (boardId / listId / cardId)
- 条件 指定 ID のレコードが DB に存在しないとき
- 出力 `NOT_FOUND` (404)
- 振る舞い 存在しない親リソースへの子リソース作成 (例 存在しない boardId 配下のリスト作成) も同様に 404。GET / POST / PATCH 全 method で共通。

### FR-004 order フィールドの採番規則

- 入力 リスト / カード の新規作成リクエスト
- 条件 親リソース (Board / List) が存在するとき
- 出力 order フィールドに整数値を採番して保存
- 振る舞い 同一親リソース配下の既存 order 最大値 + 1 を採番する。既存 0 件なら 0 を採番。並び順は order 昇順を仕様とする (createdAt はタイブレークに使わない、同一 order は本仕様では発生しない)。

### FR-005 データモデル

- 入力 Prisma schema での永続化
- 条件 SQLite ファイルにテーブルを作成
- 出力 3 テーブル (Board / List / Card) を持つ schema
- 振る舞い 以下のフィールドとリレーションで永続化する。

  | エンティティ | フィールド | 型 | 制約 |
  |---|---|---|---|
  | Board | id | string | primary key (cuid) |
  | Board | title | string | 1〜100 文字 |
  | Board | createdAt | datetime | default now() |
  | List | id | string | primary key (cuid) |
  | List | title | string | 1〜100 文字 |
  | List | order | int | 昇順で並び順を決める |
  | List | boardId | string | Board.id への FK (cascade delete) |
  | List | createdAt | datetime | default now() |
  | Card | id | string | primary key (cuid) |
  | Card | title | string | 1〜200 文字 |
  | Card | description | string? | null 許容 (未入力可) |
  | Card | order | int | 昇順で並び順を決める |
  | Card | listId | string | List.id への FK (cascade delete) |
  | Card | createdAt | datetime | default now() |

### FR-006 API レスポンスの日時形式

- 入力 createdAt を含むレスポンス
- 条件 GET / POST の成功レスポンス
- 出力 ISO 8601 文字列 (例 `2026-07-11T15:42:35.000Z`)
- 振る舞い Prisma の Date を JSON.stringify した既定形式。タイムゾーンは UTC。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-001 | バリデーション違反 (title 長さ / 空 / 型不正) | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |
| E-002 | 指定 ID のリソースが存在しない | 404 | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` |
| E-003 | サーバー内部エラー (DB 接続失敗など) | 500 | `{ "error": { "code": "INTERNAL_ERROR", "message": "サーバーエラーが発生しました" } }` |

## 境界条件

- title 長さ 0 文字 (trim 後) → 400
- title 長さ 1 文字 → 成功
- title 長さ N 文字 (Board/List=100 / Card=200) → 成功
- title 長さ N+1 文字 → 400
- title 全角スペースのみ 5 文字 → trim 後 0 文字扱いで 400
- 前後に半角スペースを含む `"  hello  "` → trim 後 `"hello"` として保存
- リスト / カード の並び 同一親内で order 昇順、同一 order は発生しない (単調増加採番)
- 存在しない親 ID への子作成 → 404 (作成しない)

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| エラーコード | はい | `VALIDATION_ERROR` / `NOT_FOUND` / `INTERNAL_ERROR` の 3 種のみ |
| エラーメッセージ | はい | 日本語文字列、空でない |
| Board.title | はい | trim 後 1〜100 文字 |
| List.title | はい | trim 後 1〜100 文字 |
| Card.title | はい | trim 後 1〜200 文字 |
| Card.description | いいえ | 未指定または文字列 (長さ制約なし) |
| order | はい (システム採番) | 0 以上の整数 |

## 参考

- constitution.md § 異常系の網羅 (HTTP 400 / 404 / 500 の 3 種を基本)
- constitution.md § シンプルさ優先 (最小実装、抽象化は後回し)
- constitution.md § セキュリティ要件 (Prisma 経由、生 SQL 禁止)
