# ラベルの仕様

## 概要

ボード単位のラベル（分類タグ）の作成・編集・削除と、カードへの付与・解除を定義する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- ラベルはボード（`spec/001_boards.md`）に属し、カード（`spec/003_cards.md`）に付与される。
- カード詳細での表示・操作は `spec/005_card_detail.md` を参照する。

## 対象データ

- Label
  - `id`: string（サーバー採番）
  - `boardId`: string（所属ボード）
  - `name`: string（1〜50文字）
  - `color`: string（事前定義色のコードのいずれか。後述）
  - `createdAt`: datetime
  - `updatedAt`: datetime
- CardLabel（カードとラベルの中間テーブル）
  - `id`: string
  - `cardId`: string
  - `labelId`: string
  - 同一 `(cardId, labelId)` の重複は作らない（ユニーク）。

### 事前定義色（本仕様で固定）

`color` は次のコードのいずれかとする（それ以外は 422）。
`gray` / `red` / `orange` / `yellow` / `green` / `blue` / `purple` / `pink`

## 機能要件

### 操作: ラベル一覧取得

- 指定ボードのラベルを取得する。

### 操作: ラベル作成

- 指定ボードに `name` と `color` を指定してラベルを作成する。

### 操作: ラベル編集

- 対象ラベルの `name` / `color` を更新する。

### 操作: ラベル削除

- 対象ラベルを削除する。付与済み（CardLabel）も同時に解除する。

### 操作: カードへのラベル付与

- 対象カードに指定ラベルを付与する（CardLabel を作成）。同一ラベルの重複付与は冪等（既に付与済みなら状態を変えず成功）。

### 操作: カードからのラベル解除

- 対象カードから指定ラベルを解除する（CardLabel を削除）。

## 画面

- カード詳細モーダルのラベル領域（`spec/005_card_detail.md`）
  - 付与済みラベルをチップ表示（`name` と `color`）。
  - ラベル選択パネルからボードのラベルを付与/解除できる。
  - ボードにラベルが 0 件のときは「ラベルなし」を表示する。
- 画面状態: ラベル選択パネル 閉 ⇄ 開。付与/解除の即時反映。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards/[boardId]/labels | ラベル一覧取得 | viewer 以上 |
| POST | /api/boards/[boardId]/labels | ラベル作成 | member 以上 |
| PATCH | /api/labels/[labelId] | ラベル編集 | member 以上 |
| DELETE | /api/labels/[labelId] | ラベル削除 | member 以上 |
| POST | /api/cards/[cardId]/labels | カードへのラベル付与（body: `{ labelId }`） | member 以上 |
| DELETE | /api/cards/[cardId]/labels/[labelId] | カードからのラベル解除 | member 以上 |

## 受入条件

- [ ] GET /api/boards/[boardId]/labels は `{ items: [...] }` 形状で 200 を返す
- [ ] ラベルが 0 件のとき GET は `{ items: [] }` を 200 で返す
- [ ] 存在しない `boardId` のラベル一覧は 404 / NOT_FOUND を返す
- [ ] POST /api/boards/[boardId]/labels に有効な `name`（1〜50文字）と定義済み `color` を渡すと 201 でラベルを返す
- [ ] POST で `name` が空文字は 422 / VALIDATION_ERROR を返す
- [ ] POST で `name` が51文字は 422 / VALIDATION_ERROR を返す
- [ ] POST で `color` が事前定義外は 422 / VALIDATION_ERROR を返す
- [ ] PATCH /api/labels/[labelId] で `name` / `color` を更新すると 200 を返す
- [ ] 存在しない `labelId` の PATCH / DELETE は 404 / NOT_FOUND を返す
- [ ] DELETE /api/labels/[labelId] は 200 を返し、当該ラベルの付与（CardLabel）も解除される
- [ ] POST /api/cards/[cardId]/labels に有効な `labelId` を渡すと 201（または 200）で付与される
- [ ] 既に付与済みのラベルを再付与すると 200 を返し、重複は作られない（冪等）
- [ ] 存在しない `cardId` / `labelId` へのラベル付与は 404 / NOT_FOUND を返す
- [ ] DELETE /api/cards/[cardId]/labels/[labelId] は 200 を返し、付与が解除される

## 異常系

- 存在しない `boardId` / `labelId` / `cardId` は 404 / NOT_FOUND。
- `name` の空文字・上限超過、`color` の事前定義外は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。member 権限なしの操作は 403 / FORBIDDEN（閲覧権限もない場合は 404）。

## 境界条件

- `name` 1文字: 許可。50文字: 許可。0文字（空）: 422。51文字: 422。
- ボードのラベル 0 件: 一覧は空配列。
- 重複付与: 冪等成功。
- 付与カードが archived / deleted の場合でもラベル付与・解除は可能（表示は詳細で行う）。

## バリデーション

- `name`: 必須、1〜50文字。空文字・上限超過は 422。
- `color`: 必須、事前定義色コードのいずれか。それ以外は 422。
- `labelId`（付与時）: 必須、対象ボードに属する存在するラベル。存在しなければ 404。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| ラベル一覧取得 | viewer 以上 | 権限なしは 404、未認証は 401 |
| ラベル作成・編集・削除 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404、検証は 422 |
| ラベル付与・解除 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404 |

## 非機能要件

- ラベル一覧取得の応答時間は200ms以内、書き込みの応答時間は300ms以内（constitution.md § 性能）。
- ラベル作成・編集・削除・付与・解除は操作ログにリクエスト ID 付きで記録する（spec/000_shared_rules.md）。

## 使用する用語

- ラベル（Label）／ボード（Board）／カード（Card）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- spec/003_cards.md
- spec/005_card_detail.md
- inputs/005_008_ui_features_spec_input.md

## 未決事項

- 事前定義色は本仕様で8色に固定した（将来の増減は本仕様の更新で行う）。
