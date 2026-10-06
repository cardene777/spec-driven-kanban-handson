# カード追加と表示の仕様

## 概要

各リスト内にカードを追加し、順番に表示する。

## 機能要件

### FR-CARD-001 一覧

- 入力: ボード詳細画面、GET /api/lists/[id]/cards。
- 条件: Listが存在する。
- 出力: 指定ListのCard一覧。
- 振る舞い: 同じList内でorder昇順に縦に表示する。

### FR-CARD-002 追加

- 入力: 各リスト末尾の「カード追加」を押して開くフォームのtitle、POST /api/lists/[id]/cards。
- 条件: List存在確認後、タイトル検証に成功する。
- 出力: 保存したCard。
- 振る舞い: 共通採番でorderを割り当てて対象List末尾に表示。descriptionは省略可能で省略時null。

## 異常系

| ID | 条件 | HTTPステータス | レスポンス |
|---|---|---|---|
| E-CARD-001 | GET/POSTのListがない（不正titleも含む） | 404 | error.code=NOT_FOUND と message |
| E-CARD-002 | 存在するListへ空/200文字超過title | 400 | error.code=VALIDATION_ERROR と message、Card追加なし、画面エラー |

## 境界条件

親に0件と2件目以降。トリム後0,1,200,201文字。description省略。

## バリデーション

| フィールド | 必須 | 制約 |
|---|---|---|
| title | はい | 共通ルール、1〜200文字 |
| listId | はい | 対象Listの存在を先に確認 |
| description | いいえ | 省略可能 |

## 並び順

同じList内で0件なら0、以降最大order+1。表示はorder昇順。同時作成は扱わない。

## 参考

constitution.md、00_common.md、02_list.md。
