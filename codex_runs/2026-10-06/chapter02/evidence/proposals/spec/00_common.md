# 共通ルールの仕様

## 概要

ボード・リスト・カードの共通モデル、入力条件、保存、並び順、エラーを定める。

## 機能要件

### FR-COM-001 データモデルと保存

- 入力: 作成するBoard、List、Card。
- 条件: 各機能の入力検証に成功する。
- 出力: SQLiteにPrismaを経由して保存したデータ。
- 振る舞い: Boardはid,title,createdAt、Listはid,title,order,boardId,createdAt、Cardはid,title,description,order,listId,createdAtを持つ。ListはBoardに属し、CardはListに属する。descriptionは省略可能。リロード後も保存した値を表示する。

### FR-COM-002 タイトルの共通検証

- 入力: title。
- 条件: 前後の半角・全角空白、タブ、改行を除去する。
- 出力: Board/Listは1〜100文字、Cardは1〜200文字ならトリム後の値。
- 振る舞い: JavaScriptのstring.lengthで検証する。空または上限超過は保存せず画面にエラーを表示する。

### FR-COM-003 表示順と採番

- 入力: 一覧取得・順番に行う作成。
- 条件: 本ハンズオンでは同時作成を扱わない。
- 出力: BoardはcreatedAt降順、List/Cardは同じ親内でorder昇順。
- 振る舞い: List/Cardが親内で0件ならorder=0、それ以後は同じ親内の最大order+1。順次作成では同じ親内にorderを重複させない。

### FR-COM-004 エラー形式と判定順

- 入力: APIへの要求。
- 条件: 対象リソースがない、または存在する対象に不正タイトルを送る。
- 出力: `{ "error": { "code": "...", "message": "..." } }`。
- 振る舞い: 対象の存在確認を先に行い、欠損時は404、対象がある場合だけタイトルを検証し400を返す。欠損のcodeはNOT_FOUND、入力検証のcodeはVALIDATION_ERROR。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-COM-001 | 対象が存在しない | 404 | error.code=NOT_FOUND と message |
| E-COM-002 | 存在する対象へのタイトルが不正 | 400 | error.code=VALIDATION_ERROR と message |

## 境界条件

- Board/List: 0,1,100,101文字。Card: 0,1,200,201文字。
- 空白だけのタイトルはトリム後に空となり拒否。
- Card.descriptionを省略したときはnull。
- 採番の0件時と2件目以降、同じ親内だけの最大値を確認する。

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| Board/List.title | はい | string、トリム後1〜100文字 |
| Card.title | はい | string、トリム後1〜200文字 |
| Card.description | いいえ | 省略可能 |

## 並び順

FR-COM-003に従う。

## 参考

constitution.mdの入力エラーと境界値。各機能仕様をまとめて/designで整理し、/implementで実装する。
