# 共通規約の仕様

## 概要

Simple Kanban 全体で共通する、データモデル・エラーレスポンス形式・並び順の採番規約・タイトルの前処理方針を定義する。各機能仕様（01〜04）はこの規約を前提とする。

## データモデル

Prisma 7 + SQLite（`@prisma/adapter-better-sqlite3`）で永続化する。

### Board

| フィールド | 型 | 制約 |
|---|---|---|
| id | String (cuid) | 主キー |
| title | String | trim 後 1〜100 文字 |
| createdAt | DateTime | 作成時に自動設定 |

### List

| フィールド | 型 | 制約 |
|---|---|---|
| id | String (cuid) | 主キー |
| title | String | trim 後 1〜100 文字 |
| order | Int | 同一 board 内の並び順（0 始まり昇順、親内で重複しない） |
| boardId | String | Board.id への外部キー |
| createdAt | DateTime | 作成時に自動設定 |

### Card

| フィールド | 型 | 制約 |
|---|---|---|
| id | String (cuid) | 主キー |
| title | String | trim 後 1〜200 文字 |
| description | String? | 省略可（作成時は null） |
| order | Int | 同一 list 内の並び順（0 始まり昇順、親内で重複しない） |
| listId | String | List.id への外部キー |
| createdAt | DateTime | 作成時に自動設定 |

## エラーレスポンス形式

全 API 共通で、エラー時は以下の JSON を返す。

```json
{ "error": { "code": "<コード>", "message": "<日本語メッセージ>" } }
```

| コード | HTTP ステータス | 用途 |
|---|---|---|
| VALIDATION_ERROR | 400 | 入力バリデーション違反 |
| NOT_FOUND | 404 | 指定 ID のリソースが存在しない |
| INTERNAL_ERROR | 500 | 予期しないサーバー側エラー |

## 判定順序（404 と 400 の優先度）

親または対象リソースの存在確認を先に行い、無ければ 404 を返す。
対象が存在する場合だけ入力を検証し、違反があれば 400 を返す。
リクエストボディに不正なタイトルが含まれていても、親／対象が存在しない場合は 404 を優先する。

## タイトルの前処理

- title は受信後、**前後の半角・全角空白、タブ、改行を除去（trim）** してから検証する。
- trim 後の文字数が下限未満・上限超過なら VALIDATION_ERROR (400)。
- DB に保存する title は trim 後の値とする。

## 並び順（order）の採番規約

- List / Card ともに作成時、同一親（board / list）内の**既存の最大 order + 1** を割り当てる（親内 0 件なら 0）。
- 同一親の中で order を重複させない。
- 第 2 章では削除機能を扱わないため、通常運用で欠番は発生しない前提とする。

## バリデーション共通方針

- title は前処理の trim を行ってから文字数を検証する。
- description は任意入力で、未指定なら null を保存する。

## 参考

- constitution.md 「入力エラーと境界値」「仕様駆動」
