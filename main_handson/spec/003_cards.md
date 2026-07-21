# カード（Card）の仕様

## 概要

タスクを表す「カード」の作成・タイトル編集・説明文編集・削除・並び順変更、およびカード詳細モーダルの基本構造を定義する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- カードはリスト（`spec/002_lists.md`）に属する。

## 対象データ

- Card
  - `id`: string（サーバー採番）
  - `listId`: string（所属リスト）
  - `title`: string（1〜200文字）
  - `description`: string（0〜2000文字）
  - `order`: integer（同一 `listId` 内の昇順。アクティブなカードで 0 始まり連番）
  - `archivedAt`: datetime | null（アーカイブ状態。`spec/004_card_movement_archive_restore.md` で追加）
  - `deletedAt`: datetime | null（ソフト削除状態。`spec/004_card_movement_archive_restore.md` で追加）
  - `createdAt`: datetime
  - `updatedAt`: datetime
- 「アクティブ」= `archivedAt == null` かつ `deletedAt == null`。状態遷移・排他ルールは `spec/004_card_movement_archive_restore.md` を参照する。

## 機能要件

### 操作: カード一覧取得

- 指定リストの**アクティブなカード**を `order` 昇順で取得する（既定）。
- `?status=archived` / `?status=deleted` でアーカイブ済み・削除済みを取得する（`spec/004_card_movement_archive_restore.md` § API）。

### 操作: カード作成

- 指定リストに `title`（必須）と `description`（任意）を指定してカードを作成する。
- `order` は同一リスト内の既存最大 + 1 を採番する。

### 操作: カードタイトル編集

- 対象カードの `title` を更新する。

### 操作: カード説明文編集

- 対象カードの `description` を更新する。

### 操作: カード削除（ソフト削除）

- 対象カードを**ソフト削除**する（`deletedAt` を設定してゴミ箱へ。復元可能）。詳細・復元・完全削除（purge, owner 専用）は `spec/004_card_movement_archive_restore.md` を参照する。

### 操作: カード並び順変更

- 対象カードの `order` を更新し、同一リスト内の並び順を変更する。

## 画面

- `/boards/[id]`（ボード詳細画面）内で、各リスト列に属するカードを `order` 昇順で表示する。
  - リストごとにカード作成フォーム（`title` 入力）を持つ。
  - カードが 0 件のリストは空状態を表示する。
- カード詳細モーダル（基本構造）
  - カードをクリックするとモーダルを開く。
  - モーダルは `title`（編集可能）と `description`（編集可能）を表示する。
  - モーダルを閉じる操作を持つ。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/lists/[listId]/cards?status=active\|archived\|deleted | カード一覧取得（既定 active） | viewer 以上 |
| POST | /api/lists/[listId]/cards | カード作成 | member 以上 |
| PATCH | /api/cards/[cardId] | カードタイトル・説明文編集・並び順変更 | member 以上 |
| DELETE | /api/cards/[cardId] | カードのソフト削除（`deletedAt` 設定・復元可能） | member 以上 |

- 完全削除（物理削除, owner 専用）・移動・アーカイブ・復元系の API は `spec/004_card_movement_archive_restore.md` を参照する。

## 受入条件

- [ ] GET /api/lists/[listId]/cards は `{ items: [...] }` 形状で 200 を返す
- [ ] GET /api/lists/[listId]/cards は既定で**アクティブなカードのみ**を `order` 昇順で返す
- [ ] アクティブなカードが 0 件のとき GET は `{ items: [] }` を 200 で返す
- [ ] 存在しない `listId` の一覧取得は 404 / NOT_FOUND を返す
- [ ] POST /api/lists/[listId]/cards に有効な `title` を渡すと 201 で作成済みカードを返す
- [ ] POST で `description` を省略するとカードの `description` は空文字になる
- [ ] POST で作成したカードの `order` は同一リスト内の既存最大 + 1 になる
- [ ] POST /api/lists/[listId]/cards に空文字 `title` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] POST /api/lists/[listId]/cards に201文字の `title` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] POST /api/lists/[listId]/cards に2001文字の `description` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] PATCH /api/cards/[cardId] に有効な `title` を渡すと 200 で更新済みカードを返す
- [ ] PATCH /api/cards/[cardId] に有効な `description` を渡すと 200 で更新済みカードを返す
- [ ] PATCH /api/cards/[cardId] に有効な `order` を渡すと 200 で並び順が更新される
- [ ] PATCH /api/cards/[cardId] で存在しない ID を指定すると 404 / NOT_FOUND を返す
- [ ] DELETE /api/cards/[cardId] は 200 を返し、対象の `deletedAt` が設定される（ソフト削除。物理削除はされない）
- [ ] DELETE /api/cards/[cardId] 後、GET（既定 active）の一覧から当該カードが外れる
- [ ] DELETE /api/cards/[cardId] で存在しない ID を指定すると 404 / NOT_FOUND を返す

## 異常系

- 存在しない `listId` / `cardId` は 404 / NOT_FOUND。
- `title` が空文字・上限超過（201文字以上）は 422 / VALIDATION_ERROR。
- `description` が上限超過（2001文字以上）は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。
- member 権限のない操作は 403 / FORBIDDEN（閲覧権限もない場合は 404）。

## 境界条件

- `title` 1文字: 許可。
- `title` 200文字: 許可。
- `title` 0文字（空）: 422。
- `title` 201文字: 422。
- `description` 0文字（空）: 許可。
- `description` 2000文字: 許可。
- `description` 2001文字: 422。

## バリデーション

- `title`: 必須、1〜200文字。空文字・上限超過は 422 / VALIDATION_ERROR。
- `description`: 任意、0〜2000文字。上限超過は 422 / VALIDATION_ERROR。省略時は空文字。
- `order`: 並び順変更時は整数。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| カード一覧取得 | viewer 以上 | 権限なしは 404 |
| カード作成 | member 以上 | 権限不足は 403、未認証は 401 |
| カードタイトル・説明文編集・並び順変更 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404 |
| カードのソフト削除 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404 |
| カードの完全削除（purge） | owner | `spec/004_card_movement_archive_restore.md` 参照 |

## 非機能要件

- 一覧取得 API の P95 は 200ms 以内（constitution.md § 性能）。
- 書き込み API の P95 は 300ms 以内（constitution.md § 性能）。
- 操作ログ・エラーログにリクエスト ID を付与する（spec/000_shared_rules.md § ログ方針）。

## 使用する用語

- カード（Card）（constitution.md § 用語集 参照）
- リスト（List）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/002_lists.md
- spec/004_card_movement_archive_restore.md（アーカイブ・移動・ソフト削除/復元/完全削除の詳細）
- inputs/001_core_kanban_spec_input.md

## 未決事項

- なし
