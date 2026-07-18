# リスト機能の仕様

## 概要

リスト（List）は、ボード内でカードをグループ化する列である。
本ファイルは、リストの作成、名称編集、削除、並び順の仕様を定義する。
共通ルールは `spec/000_shared_rules.md` を参照する。

## 既存仕様との関係

- 本章 02 セクションで新規作成。既存の List 仕様はない。
- `Board` に属するため、`spec/001_boards.md` の権限とカスケード削除の規約を引き継ぐ。

## 対象データ

`List` エンティティのフィールド。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | リストを一意に識別する ID |
| `boardId` | 文字列 | 所属する Board.id への外部キー |
| `title` | 文字列 | リスト名（trim 後 1〜100 文字） |
| `order` | 数値 | 同一 `boardId` 内での並び順（昇順） |
| `createdAt` | ISO8601 UTC | 作成日時 |
| `updatedAt` | ISO8601 UTC | 更新日時 |

## 機能要件

### 操作: リスト一覧取得（ボード単位）

- 指定 `boardId` に属するリストを、`order` 昇順・`createdAt` 昇順で全件返す。
- リスト 0 件でも `200` で `{ "items": [] }` を返す。

### 操作: リスト作成

- 入力項目は `title` のみ。
- 作成後、同一 `boardId` 内の末尾（`order = max + 1`、0 件なら 0）に配置される。
- 同一 `boardId` 内で `order` は重複させない。

### 操作: リスト名編集

- 変更対象は `title` のみ。
- `updatedAt` を更新する。

### 操作: リスト削除

- 削除操作は明示的な確認（確認ダイアログ等）を伴う。UI 詳細は `ui-design/` で決定する。
- 削除時、共通ルールに従い配下のカードを全て削除する。

## 画面

- ボード詳細（`/boards/[id]`）内でリストを横並びに表示する。詳細な部品分割は `ui-design/` で扱う。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `GET` | `/api/boards/{boardId}/lists` | 指定ボードのリスト一覧を取得 | 対象ボードの `viewer` 以上 |
| `POST` | `/api/boards/{boardId}/lists` | リストを新規作成 | 対象ボードの `member` 以上 |
| `PATCH` | `/api/lists/{listId}` | リスト名を更新 | 対象リストが属するボードの `member` 以上 |
| `DELETE` | `/api/lists/{listId}` | リストを削除 | 対象リストが属するボードの `member` 以上 |

- 一覧 API のレスポンスは `{ "items": List[] }`、単体 API のレスポンスは `List` オブジェクト。
- 判定順序は `spec/000_shared_rules.md § Route Handler の入口チェック順序` に従う。

## 受入条件

- [ ] FR-001: 対象ボードの `viewer` 以上が `GET /api/boards/{boardId}/lists` を呼ぶと、リストが `order` 昇順で `{ "items": [...] }` として返る。
- [ ] FR-002: リスト 0 件のとき、一覧 API は `200` で `{ "items": [] }` を返す。
- [ ] FR-003: 対象ボードの `member` 以上が `POST /api/boards/{boardId}/lists` で `title` を 1〜100 文字で送ると、`201` と作成された List が返り、同一ボード内 `order` の末尾に追加される。
- [ ] FR-004: `PATCH /api/lists/{listId}` に `title` を 1〜100 文字で送ると、`200` と更新された List が返る。
- [ ] FR-005: `DELETE /api/lists/{listId}` を送ると、`204` を返し、当該リスト配下の Card もすべて削除される。
- [ ] FR-006: 存在しない `boardId` / `listId` を指定すると `404 NOT_FOUND` を返す。
- [ ] FR-007: 対象ボードの `viewer` が書き込み API を呼ぶと `403 FORBIDDEN` を返す。
- [ ] FR-008: `title` が空・101 文字以上・非文字列だと `422 VALIDATION_ERROR` が返り、List は作成／更新されない。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコードとエラーレスポンス` と `§ Route Handler の入口チェック順序` に従う。

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで API 呼出 | `401 UNAUTHORIZED` | 全 API 共通 |
| 存在しない `boardId` / `listId` を指定 | `404 NOT_FOUND` | 一覧・単体すべて |
| 対象ボードの閲覧権限がない | `404 NOT_FOUND` | 存在有無を漏らさないため 404 に統一 |
| 対象ボードの `viewer` が書き込み API を呼ぶ | `403 FORBIDDEN` | 認証済み、閲覧可の状態が前提 |

### バリデーションエラー

| 状況 | ステータス | エラーコード | details |
|---|---|---|---|
| `title` 未指定または trim 後 0 文字 | `422` | `VALIDATION_ERROR` | `{ "title": "required" }` |
| `title` が trim 後 101 文字以上 | `422` | `VALIDATION_ERROR` | `{ "title": "too_long" }` |
| `title` が文字列型でない | `422` | `VALIDATION_ERROR` | `{ "title": "invalid_type" }` |

## 境界条件

- `title` = 1 文字（下限ちょうど）: 受け付ける。
- `title` = 100 文字（上限ちょうど）: 受け付ける。
- `title` = 101 文字: `422` を返す。
- `title` = 0 文字（空文字）: `422` を返す。
- 前後空白のみの `title`: トリム後 0 文字で `422`。
- リスト 0 件のボード: 一覧 API は `{ "items": [] }` を `200` で返す。画面は空状態を表示する。
- リスト削除直後に同 ID を GET すると `404` を返す。
- 存在しない `boardId` に対する作成／取得はすべて `404`。

## バリデーション

| フィールド | 必須 | ルール |
|---|---|---|
| `title` | はい | 文字列。前後の半角・全角空白、タブ、改行を除去した後 1〜100 文字。 |
| `boardId`（パス） | はい | 文字列。存在しなければ `404`。閲覧権限がなくても `404`。 |
| `listId`（パス） | はい | 文字列。存在しなければ `404`。閲覧権限がなくても `404`。 |

作成 API では `id` / `order` / `createdAt` / `updatedAt` はクライアントから受け取らない。
更新 API で受け付けるのは `title` のみ。

## 権限境界

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| リスト一覧取得（`GET /api/boards/{id}/lists`） | 対象ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |
| リスト作成（`POST /api/boards/{id}/lists`） | 対象ボードの `member` 以上 | 未ログイン `401`、閲覧不可 `404`、`viewer` は `403` |
| リスト編集（`PATCH /api/lists/{id}`） | 対象ボードの `member` 以上 | 同上 |
| リスト削除（`DELETE /api/lists/{id}`） | 対象ボードの `member` 以上 | 同上 |

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。List 固有の追加要件は無し。

## 使用する用語

- リスト（List）（`constitution.md § 用語集` 参照）

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `inputs/001_core_kanban_spec_input.md`

## 未決事項

- リスト並び替え API（`order` の変更）は本 spec の対象外とし、別 spec で扱う。
- 削除確認ダイアログの文言、空状態の文言は `ui-design/` で決める。
