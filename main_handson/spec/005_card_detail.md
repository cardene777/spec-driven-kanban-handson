# カード詳細の仕様

## 概要

カード詳細ビューで、タイトル・説明文・ラベル・期限を表示・編集する領域を定義する。カードをクリックして開くモーダルの構造を、ラベル（spec/006）・期限（spec/007）と統合して規定する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- カード本体（title/description/order 等）は `spec/003_cards.md`、状態（archived/deleted）は `spec/004_card_movement_archive_restore.md` を継承する。
- ラベルは `spec/006_label.md`、期限は `spec/007_due_date.md` を参照する（本仕様はそれらの表示・編集の集約点）。
- カード詳細取得レスポンスに `labels` と `dueDate` を含める（spec/006・007 で追加するフィールドの集約）。

## 対象データ

- Card（`spec/003_cards.md` / `spec/007_due_date.md`）
  - `id` / `listId` / `title`（1〜200文字）/ `description`（0〜2000文字）/ `order` / `archivedAt` / `deletedAt` / `createdAt` / `updatedAt`
  - `dueDate`: date | null（spec/007 で追加）
- 付与ラベル（`spec/006_label.md`）
  - カードに付与された Label の配列 `labels: Label[]`

## 機能要件

### 操作: カード詳細の取得

- 対象カードの `title` / `description` / `dueDate` / 付与ラベル `labels` を取得する。

### 操作: タイトル編集 / 説明文編集

- `spec/003_cards.md` の PATCH でタイトル・説明文を更新する（本仕様で再定義しない）。

### 操作: ラベルの付与・解除 / 期限の設定・変更・解除

- `spec/006_label.md` / `spec/007_due_date.md` の操作を、カード詳細モーダルから実行する。

## 画面

- カード詳細モーダル（ボード詳細 `/boards/[id]` 上で開く）
  - 領域: タイトル編集領域 ／ 説明文編集領域 ／ ラベル領域（付与済みラベル表示・付与/解除操作）／ 期限領域（期限表示・設定/変更/解除）／ 操作領域（アーカイブ・削除・保存・閉じる）。
  - ラベルが 0 件のときはラベル領域に「ラベルなし」を表示する。
  - 期限が未設定のときは期限領域に「期限なし」を表示する。
  - 期限切れ（`dueDate` が本日より前）のときは期限を強調表示する（spec/007）。
- 画面状態
  - モーダル: 閉 → 開（カードクリック）→ 閉（閉じる/保存後）。
  - タイトル/説明文: 表示 ⇄ 編集中。
  - ラベル付与: ラベル選択パネル 閉 ⇄ 開。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/cards/[cardId] | カード詳細取得（card + labels + dueDate） | viewer 以上 |

- タイトル/説明文編集は `spec/003_cards.md` の PATCH、ラベル・期限操作は spec/006・007 の API を用いる。

## 受入条件

- [ ] GET /api/cards/[cardId] は 200 で `title` / `description` / `dueDate` / `labels` を含むカードを返す
- [ ] ラベル未付与のカードの GET は `labels` を空配列 `[]` で返す
- [ ] 期限未設定のカードの GET は `dueDate` を null で返す
- [ ] 存在しない `cardId` の GET は 404 / NOT_FOUND を返す

## 異常系

- 存在しない `cardId` は 404 / NOT_FOUND。
- 未認証は 401 / UNAUTHORIZED。閲覧権限なしは 404。

## 境界条件

- ラベル 0 件: `labels` は `[]`。
- 期限未設定: `dueDate` は null。
- 説明文 0 文字: 許可（空表示）。

## バリデーション

- 本仕様は取得のみ。編集時の検証は spec/003（title/description）・006（label）・007（dueDate）に従う。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| カード詳細取得 | viewer 以上 | 権限なしは 404、未認証は 401 |
| タイトル/説明文/ラベル/期限の編集 | member 以上 | 各 spec（003/006/007）に従う |

## 非機能要件

- カード詳細取得の P95 は 200ms 以内（constitution.md § 性能）。
- 取得系のため操作ログは必須ではないが、エラーはリクエスト ID 付きで記録する（spec/000_shared_rules.md）。

## 使用する用語

- カード（Card）／ラベル（Label）／期限（Due Date）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/003_cards.md
- spec/004_card_movement_archive_restore.md
- spec/006_label.md
- spec/007_due_date.md
- inputs/005_008_ui_features_spec_input.md

## 未決事項

- 担当者・コメントの詳細表示は後続仕様で扱う（本仕様の対象外）。
