# 共通規約の仕様

## 概要

第2章のシンプルカンバン全体で共通する、データモデル・エラーレスポンス形式・並び順の採番規約を定義する。各機能仕様（01〜04）はこの規約を前提とする。

## データモデル

Prisma + SQLite で永続化する。

### Board

| フィールド | 型 | 制約 |
|---|---|---|
| id | String (cuid) | 主キー |
| title | String | 1〜100文字（trim後） |
| createdAt | DateTime | 作成時に自動設定 |

### List

| フィールド | 型 | 制約 |
|---|---|---|
| id | String (cuid) | 主キー |
| title | String | 1〜100文字（trim後） |
| order | Int | 同一board内の並び順（0始まり昇順） |
| boardId | String | Board.id への外部キー |
| createdAt | DateTime | 作成時に自動設定 |

### Card

| フィールド | 型 | 制約 |
|---|---|---|
| id | String (cuid) | 主キー |
| title | String | 1〜200文字（trim後） |
| description | String? | 省略可能（作成時は null） |
| order | Int | 同一list内の並び順（0始まり昇順） |
| listId | String | List.id への外部キー |
| createdAt | DateTime | 作成時に自動設定 |

## エラーレスポンス形式

全 API 共通で、エラー時は以下の JSON を返す。

```json
{ "error": { "code": "<コード>", "message": "<日本語メッセージ>" } }
```

| コード | HTTPステータス | 用途 |
|---|---|---|
| VALIDATION_ERROR | 400 | 入力バリデーション違反 |
| NOT_FOUND | 404 | 指定IDのリソースが存在しない |

## 並び順（order）の採番規約

- List/Card ともに作成時、同一親（board / list）内の**既存件数**を order に設定する（0始まり、末尾に追加）。
- 第2章では削除機能がないため、order に欠番は生じない前提とする。

## バリデーション共通方針

- title は受信後に前後の空白を trim してから文字数を検証する。
- trim 後の文字数が下限未満・上限超過なら VALIDATION_ERROR (400)。
- DB に保存する title は trim 後の値とする。

## 参考

- constitution.md 「異常系の網羅」「シンプルさ優先」「HTTPステータスとエラーメッセージを統一する」
