# リスト（List）の仕様

## 概要

ボード内の列である「リスト」の作成・名称編集・削除・並び順変更を定義する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- リストはボード（`spec/001_boards.md`）に属し、カード（`spec/003_cards.md`）を内包する。

## 対象データ

- List
  - `id`: string（サーバー採番）
  - `boardId`: string（所属ボード）
  - `title`: string（1〜100文字）
  - `order`: integer（同一 `boardId` 内の昇順）
  - `createdAt`: datetime
  - `updatedAt`: datetime

## 機能要件

### 操作: リスト一覧取得

- 指定ボードのリストを `order` 昇順で取得する。

### 操作: リスト作成

- 指定ボードに `title` を指定してリストを作成する。
- `order` は同一ボード内の既存最大 + 1 を採番する。

### 操作: リスト名編集

- 対象リストの `title` を更新する。

### 操作: リスト削除

- 対象リストを削除する。配下のカードは**状態問わず（active / archived / deleted すべて）物理 cascade 削除**する（`spec/004_card_movement_archive_restore.md` § 状態遷移とリスト削除）。リスト削除後は当該カードを復元できない。

### 操作: リスト並び順変更

- 対象リストの `order` を更新し、同一ボード内の並び順を変更する。

## 画面

- `/boards/[id]`（ボード詳細画面）内に列としてリストを表示する。
  - リストは `order` 昇順で横並び表示する。
  - リスト作成フォーム（`title` 入力）を持つ。
  - リストが 0 件のとき空状態を表示する。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards/[boardId]/lists | リスト一覧取得 | viewer 以上 |
| POST | /api/boards/[boardId]/lists | リスト作成 | member 以上 |
| PATCH | /api/lists/[listId] | リスト名編集・並び順変更 | member 以上 |
| DELETE | /api/lists/[listId] | リスト削除 | member 以上 |

## 受入条件

- [ ] GET /api/boards/[boardId]/lists は `{ items: [...] }` 形状で 200 を返す
- [ ] GET /api/boards/[boardId]/lists は items を `order` 昇順で返す
- [ ] リストが 0 件のとき GET は `{ items: [] }` を 200 で返す
- [ ] 存在しない `boardId` の一覧取得は 404 / NOT_FOUND を返す
- [ ] POST /api/boards/[boardId]/lists に有効な `title` を渡すと 201 で作成済みリストを返す
- [ ] POST で作成したリストの `order` は同一ボード内の既存最大 + 1 になる
- [ ] POST /api/boards/[boardId]/lists に空文字 `title` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] POST /api/boards/[boardId]/lists に101文字の `title` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] PATCH /api/lists/[listId] に有効な `title` を渡すと 200 で更新済みリストを返す
- [ ] PATCH /api/lists/[listId] に有効な `order` を渡すと 200 で並び順が更新される
- [ ] PATCH /api/lists/[listId] で存在しない ID を指定すると 404 / NOT_FOUND を返す
- [ ] DELETE /api/lists/[listId] は 200（または 204）を返し、配下のカードも削除される
- [ ] DELETE /api/lists/[listId] で存在しない ID を指定すると 404 / NOT_FOUND を返す

## 異常系

- 存在しない `boardId` / `listId` は 404 / NOT_FOUND。
- `title` が空文字・上限超過は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。
- member 権限のない操作は 403 / FORBIDDEN（閲覧権限もない場合は 404）。

## 境界条件

- `title` 1文字: 許可。
- `title` 100文字: 許可。
- `title` 0文字（空）: 422。
- `title` 101文字: 422。

## バリデーション

- `title`: 必須、1〜100文字。空文字・上限超過は 422 / VALIDATION_ERROR。
- `order`: 並び順変更時は整数。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| リスト一覧取得 | viewer 以上 | 権限なしは 404 |
| リスト作成 | member 以上 | 権限不足は 403、未認証は 401 |
| リスト名編集・並び順変更 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404 |
| リスト削除 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404 |

## 非機能要件

- 一覧取得 API の P95 は 200ms 以内（constitution.md § 性能）。
- 書き込み API の P95 は 300ms 以内（constitution.md § 性能）。
- 操作ログ・エラーログにリクエスト ID を付与する（spec/000_shared_rules.md § ログ方針）。

## 使用する用語

- リスト（List）（constitution.md § 用語集 参照）
- ボード（Board）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- inputs/001_core_kanban_spec_input.md

## 未決事項

- なし
