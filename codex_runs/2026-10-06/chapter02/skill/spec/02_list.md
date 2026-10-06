# ボード詳細とリスト作成の仕様

## 概要

ボード詳細画面でBoard名、List一覧、List内のCard一覧を表示する。

## 機能要件

### FR-LIST-001 詳細とリスト一覧

- 入力: /boards/[id]、GET /api/boards/[id]/lists。
- 条件: Boardが存在する。
- 出力: 指定Boardと属するList一覧。
- 振る舞い: ボード名とリスト一覧を表示。リストは横並びでorder昇順。Card表示は03_card.mdに従う。

### FR-LIST-002 作成

- 入力: 「リスト作成」を押して開くフォームのtitle、POST /api/boards/[id]/lists。
- 条件: Boardの存在確認後、タイトル検証に成功する。
- 出力: 保存したList。
- 振る舞い: 共通採番でorderを割り当て、対象Boardに属するListとして末尾に表示する。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-LIST-001 | GET/POSTのBoardがない（不正titleも含む） | 404 | error.code=NOT_FOUND と message |
| E-LIST-002 | 存在するBoardへ空/100文字超過title | 400 | error.code=VALIDATION_ERROR と message、List追加なし |

## 境界条件

親に0件と2件目以降。トリム後0,1,100,101文字。

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| title | はい | 共通ルール、1〜100文字 |
| boardId | はい | 対象Boardの存在を先に確認 |

## 並び順

同じBoard内で0件なら0、以降最大order+1。表示はorder昇順。同時作成は扱わない。

## 参考

constitution.md、00_common.md、01_board.md、03_card.md。
