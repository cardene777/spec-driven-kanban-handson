# 期限の仕様

## 概要

カードへの期限（完了予定日）の設定・変更・解除と、期限切れ表示を定義する。期限は日付のみで時刻は扱わない。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- 期限はカード（`spec/003_cards.md`）のフィールドとして追加する。カード詳細での表示・操作は `spec/005_card_detail.md`。
- 設定・変更・解除は `spec/003_cards.md` の `PATCH /api/cards/[cardId]` を拡張して `dueDate` を受け取る（本仕様で追加）。

## 対象データ

- Card（`spec/003_cards.md` に追加）
  - `dueDate`: date | null（完了予定日。日付のみ・時刻なし。null は未設定）

## 機能要件

### 操作: 期限の設定 / 変更

- `PATCH /api/cards/[cardId]` の `dueDate` に `YYYY-MM-DD` 形式の日付文字列を渡し、期限を設定または変更する。

### 操作: 期限の解除

- `PATCH /api/cards/[cardId]` の `dueDate` に `null` を渡し、期限を解除する。

### 操作: 期限切れ表示

- `dueDate` が本日（サーバー基準の当日）より前の日付のとき、期限切れとして扱い、画面で強調表示する。

## 画面

- カード詳細モーダルの期限領域（`spec/005_card_detail.md`）
  - 期限が設定されていれば日付を表示。未設定なら「期限なし」。
  - 期限切れのときは強調表示（色などは UI 設計に委ねる）。
  - 日付入力（date picker）で設定・変更、解除ボタンで null 化。
- カード（列内）にも期限が設定されていれば日付バッジを表示し、期限切れは強調する。
- 画面状態: 期限表示 ⇄ 日付編集中。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| PATCH | /api/cards/[cardId] | 期限の設定・変更・解除（`dueDate`） | member 以上 |

- `dueDate` は `YYYY-MM-DD` 文字列または `null`。他のフィールド（title/description/order）と同一 PATCH で併用可能。

## 受入条件

- [ ] PATCH /api/cards/[cardId] に `dueDate="2026-08-01"` を渡すと 200 を返し、`dueDate` が設定される
- [ ] PATCH /api/cards/[cardId] に `dueDate=null` を渡すと 200 を返し、`dueDate` が null になる
- [ ] PATCH /api/cards/[cardId] に不正な日付文字列（例 `"2026-13-40"` / `"abc"`）を渡すと 422 / VALIDATION_ERROR を返す
- [ ] 存在しない `cardId` の PATCH は 404 / NOT_FOUND を返す
- [ ] GET /api/cards/[cardId] の応答 `dueDate` は設定日または null を返す（`spec/005_card_detail.md`）
- [ ] `dueDate` が本日より前のカードは期限切れとして識別できる（画面で強調）

## 異常系

- 存在しない `cardId` は 404 / NOT_FOUND。
- `dueDate` が `YYYY-MM-DD` として解釈できない値は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。member 権限なしは 403 / FORBIDDEN（閲覧権限もない場合は 404）。

## 境界条件

- `dueDate` = 本日: 期限切れではない（当日は含めない）。
- `dueDate` = 昨日以前: 期限切れ。
- `dueDate` = null: 未設定（期限切れ判定の対象外）。
- 過去日の設定: 許可（設定した時点で期限切れ表示になる）。

## バリデーション

- `dueDate`: 省略時は変更しない。`null` は解除。文字列は `YYYY-MM-DD` 形式かつ実在する日付であること。形式・日付として不正は 422。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| 期限の設定・変更・解除 | member 以上 | 権限不足は 403、未認証は 401、存在なしは 404、検証は 422 |
| 期限の閲覧 | viewer 以上 | 権限なしは 404 |

## 非機能要件

- 期限更新（PATCH）の応答時間は300ms以内（constitution.md § 性能）。
- 期限の設定・変更・解除は操作ログにリクエスト ID 付きで記録する（spec/000_shared_rules.md）。

## 使用する用語

- 期限（Due Date）／カード（Card）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/003_cards.md
- spec/005_card_detail.md
- inputs/005_008_ui_features_spec_input.md

## 未決事項

- 期限切れ判定の基準日はサーバー基準の当日とする（タイムゾーンの厳密化は将来要件で再検討）。
