# 検索と絞り込みの仕様

## 概要

ボード内のカードを、タイトル・説明文のキーワード検索と、ラベル・期限・アーカイブ状態による絞り込みで抽出する機能を定義する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- 検索対象はカード（`spec/003_cards.md`）。状態は `spec/004_card_movement_archive_restore.md`、ラベルは `spec/006_label.md`、期限は `spec/007_due_date.md` を参照する。
- 担当者・コメントは本仕様の検索対象・絞り込み条件に**含めない**（後続仕様で扱う）。

## 対象データ

- 検索対象: 指定ボードに属するカード（Card）。削除済み（`deletedAt != null`）は検索対象から除外する。
- 絞り込み軸: ラベル（`labelId`）、期限（`due`）、アーカイブ状態（`status`）。

## 機能要件

### 操作: カード検索・絞り込み

- 指定ボードのカードを、キーワード・ラベル・期限・状態の条件で抽出する。
- キーワード: `title` または `description` に部分一致（大文字小文字は ASCII について区別しない）。空キーワードは全件（他条件のみ適用）。
- ラベル: `labelId` 指定時、そのラベルが付与されたカードのみ。
- 期限: `due` により絞り込む（`any` 既定 / `overdue` 期限切れ / `set` 期限あり / `unset` 期限なし）。
- 状態: `status` により絞り込む（`active` 既定 / `archived`）。deleted は対象外。
- 結果はカードの配列で返す（並びは `listId`、`order` 昇順）。

## 画面

- ボード詳細 `/boards/[id]` の検索・絞り込みバー
  - キーワード入力（0〜100文字）。
  - ラベル選択（ボードのラベルから1つ）、期限セレクト（any/overdue/set/unset）、状態セレクト（active/archived）。
  - 条件に合致するカードのみ表示。結果 0 件のときは「該当するカードがありません」を表示する。
- 画面状態: 検索バー 入力中 / 適用中 / 条件クリア。結果 0 件表示。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards/[boardId]/search?keyword=&labelId=&due=&status= | カード検索・絞り込み | viewer 以上 |

- クエリはすべて任意。`keyword` 未指定/空は全件対象、`labelId` 未指定は絞り込みなし、`due` 既定 `any`、`status` 既定 `active`。

## 受入条件

- [ ] GET /api/boards/[boardId]/search は `{ items: [...] }` 形状で 200 を返す
- [ ] `keyword` にタイトル/説明文の部分文字列を渡すと、一致するカードのみ返す
- [ ] `keyword` を空（未指定）にすると、他条件に合うカードを全件返す
- [ ] `labelId` を指定すると、そのラベルが付与されたカードのみ返す
- [ ] `due=overdue` を指定すると、期限が本日より前のカードのみ返す
- [ ] `due=set` は期限ありのみ、`due=unset` は期限なしのみを返す
- [ ] `status=active` は未アーカイブのみ、`status=archived` はアーカイブ済みのみを返す（deleted は常に除外）
- [ ] 条件に合致するカードが無いとき `{ items: [] }` を 200 で返す
- [ ] `keyword` が101文字のとき 422 / VALIDATION_ERROR を返す
- [ ] `due` / `status` に未定義値を渡すと 422 / VALIDATION_ERROR を返す
- [ ] 存在しない `boardId` の検索は 404 / NOT_FOUND を返す

## 異常系

- 存在しない `boardId` は 404 / NOT_FOUND。
- `keyword` が上限超過（101文字以上）、`due` / `status` が未定義値は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。閲覧権限なしは 404。

## 境界条件

- `keyword` 0文字: 全件対象（他条件のみ）。
- `keyword` 100文字: 許可。101文字: 422。
- ラベル 0 件のボード: `labelId` 指定なしなら通常検索、指定ありは 0 件になり得る。
- 期限未設定カード: `due=unset` で一致、`due=set` / `due=overdue` では除外。
- 検索結果 0 件: `{ items: [] }`。

## バリデーション

- `keyword`: 任意、0〜100文字。上限超過は 422。
- `labelId`: 任意、文字列。存在しないラベル ID は結果 0 件（404 にはしない）。
- `due`: 任意、`any` / `overdue` / `set` / `unset` のいずれか。未定義値は 422。
- `status`: 任意、`active` / `archived` のいずれか。未定義値は 422。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| カード検索・絞り込み | viewer 以上 | 権限なしは 404、未認証は 401、検証は 422 |

## 非機能要件

- 検索の応答時間は200ms以内（constitution.md § 性能。ローカルSQLite・少量データ前提）。
- 検索はエラーをリクエスト ID 付きで記録する（spec/000_shared_rules.md）。

## 使用する用語

- カード（Card）／ラベル（Label）／期限（Due Date）／アーカイブ（Archive）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/003_cards.md
- spec/004_card_movement_archive_restore.md
- spec/006_label.md
- spec/007_due_date.md
- inputs/005_008_ui_features_spec_input.md

## 未決事項

- ラベル絞り込みは単一 `labelId`（複数ラベル AND/OR 指定は将来要件）。
- キーワードの大文字小文字非依存は ASCII 範囲（日本語は原文一致）。厳密な正規化は将来要件。
