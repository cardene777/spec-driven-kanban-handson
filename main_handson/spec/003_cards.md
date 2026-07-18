# カード機能の仕様

## 概要

カード（Card）は、リスト内に配置されるタスクを表す項目である。
本ファイルは、カードの作成、タイトル編集、説明文編集、削除の仕様と、カード詳細モーダルの基本構造を定義する。
共通ルールは `spec/000_shared_rules.md` を参照する。

## 既存仕様との関係

- 本章 02 セクションで新規作成。既存の Card 仕様はない。
- `List` を経由して `Board` に属するため、`spec/002_lists.md` と `spec/001_boards.md` の権限とカスケード削除の規約を引き継ぐ。

## 対象データ

`Card` エンティティのフィールド。

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | カードを一意に識別する ID |
| `listId` | 文字列 | 所属する List.id への外部キー |
| `title` | 文字列 | カード名（trim 後 1〜200 文字） |
| `description` | 文字列 | 説明文（0〜2000 文字。空文字許容） |
| `order` | 数値 | 同一 `listId` 内での並び順（昇順） |
| `createdAt` | ISO8601 UTC | 作成日時 |
| `updatedAt` | ISO8601 UTC | 更新日時 |

## 機能要件

### 操作: カード一覧取得（リスト単位）

- 指定 `listId` に属するカードを、`order` 昇順・`createdAt` 昇順で全件返す。
- カード 0 件でも `200` で `{ "items": [] }` を返す。

### 操作: カード作成

- 入力項目は `title` のみ（`description` は任意。省略時は空文字）。
- 作成後、同一 `listId` 内の末尾（`order = max + 1`、0 件なら 0）に配置される。
- 同一 `listId` 内で `order` は重複させない。

### 操作: カードタイトル編集

- 変更対象は `title`。
- 単体編集 API は `{ "title": string }` を受け付ける。
- `updatedAt` を更新する。

### 操作: カード説明文編集

- 変更対象は `description`。
- 単体編集 API は `{ "description": string }` を受け付ける。
- 0 文字（空文字）で「説明なし」を表現する。
- `updatedAt` を更新する。

### 操作: カード削除

- 削除操作は明示的な確認（確認ダイアログ等）を伴う。UI 詳細は `ui-design/` で決定する。

### カード詳細モーダルの基本構造

- ボード詳細画面上で、カードをクリックするとカード詳細モーダルを開く。
- モーダルには `title`、`description`、`createdAt`、`updatedAt` を表示する。
- モーダル上で `title` と `description` を編集できる。
- ラベル、期限、担当者、コメントは本章 03 以降のセクションで拡張するため、基本構造だけを本 spec で確定する。

## 画面

- ボード詳細（`/boards/[id]`）内で、リストの中にカードを縦並びに表示する。
- カードクリックでカード詳細モーダルを開く。詳細な部品分割は `ui-design/` で扱う。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| `GET` | `/api/lists/{listId}/cards` | 指定リストのカード一覧を取得 | 所属ボードの `viewer` 以上 |
| `POST` | `/api/lists/{listId}/cards` | カードを新規作成 | 所属ボードの `member` 以上 |
| `GET` | `/api/cards/{cardId}` | カード詳細を取得 | 所属ボードの `viewer` 以上 |
| `PATCH` | `/api/cards/{cardId}` | カードのタイトルや説明文を更新 | 所属ボードの `member` 以上 |
| `DELETE` | `/api/cards/{cardId}` | カードを削除 | 所属ボードの `member` 以上 |

- 一覧 API のレスポンスは `{ "items": Card[] }`、単体 API のレスポンスは `Card` オブジェクト。
- 判定順序は `spec/000_shared_rules.md § Route Handler の入口チェック順序` に従う。
- `PATCH /api/cards/{cardId}` は `title` と `description` の片方または両方を受け付ける。両方省略した場合は `422`。

## 受入条件

- [ ] FR-001: 所属ボードの `viewer` 以上が `GET /api/lists/{listId}/cards` を呼ぶと、カードが `order` 昇順で `{ "items": [...] }` として返る。
- [ ] FR-002: カード 0 件のとき、一覧 API は `200` で `{ "items": [] }` を返す。
- [ ] FR-003: 所属ボードの `member` 以上が `POST /api/lists/{listId}/cards` で `title` を 1〜200 文字で送ると、`201` と作成された Card（`description` は空文字）が返り、同一リスト内 `order` の末尾に追加される。
- [ ] FR-004: `PATCH /api/cards/{cardId}` に `title` を 1〜200 文字で送ると、`200` と更新された Card が返る。
- [ ] FR-005: `PATCH /api/cards/{cardId}` に `description` を 0〜2000 文字で送ると、`200` と更新された Card が返る。
- [ ] FR-006: `DELETE /api/cards/{cardId}` を送ると、`204` を返し、当該カードは一覧から消える。
- [ ] FR-007: 存在しない `listId` / `cardId` を指定すると `404 NOT_FOUND` を返す。
- [ ] FR-008: 所属ボードの閲覧権限がない場合、書き込み API は `404 NOT_FOUND` を返す（存在有無を漏らさない）。
- [ ] FR-009: 所属ボードの `viewer` が書き込み API を呼ぶと `403 FORBIDDEN` を返す。
- [ ] FR-010: `title` が空・201 文字以上・非文字列だと `422 VALIDATION_ERROR` が返り、Card は作成／更新されない。
- [ ] FR-011: `description` が 2001 文字以上・非文字列だと `422 VALIDATION_ERROR` が返り、Card は更新されない。
- [ ] FR-012: カード詳細モーダルを開くと、`title` と `description` が表示され、その場で編集して保存できる。

## 異常系

`spec/000_shared_rules.md § HTTP ステータスコードとエラーレスポンス` と `§ Route Handler の入口チェック順序` に従う。

### 認証、権限、存在チェック

| 状況 | ステータス | 補足 |
|---|---|---|
| 未ログインで API 呼出 | `401 UNAUTHORIZED` | 全 API 共通 |
| 存在しない `listId` / `cardId` を指定 | `404 NOT_FOUND` | 一覧・単体すべて |
| 所属ボードの閲覧権限がない | `404 NOT_FOUND` | 存在有無を漏らさないため 404 に統一 |
| 所属ボードの `viewer` が書き込み API を呼ぶ | `403 FORBIDDEN` | 認証済み、閲覧可の状態が前提 |

### バリデーションエラー

| 状況 | ステータス | エラーコード | details |
|---|---|---|---|
| `title` 未指定または trim 後 0 文字 | `422` | `VALIDATION_ERROR` | `{ "title": "required" }` |
| `title` が trim 後 201 文字以上 | `422` | `VALIDATION_ERROR` | `{ "title": "too_long" }` |
| `title` が文字列型でない | `422` | `VALIDATION_ERROR` | `{ "title": "invalid_type" }` |
| `description` が 2001 文字以上 | `422` | `VALIDATION_ERROR` | `{ "description": "too_long" }` |
| `description` が文字列型でない | `422` | `VALIDATION_ERROR` | `{ "description": "invalid_type" }` |
| `PATCH /api/cards/{id}` で `title` も `description` も指定されない | `422` | `VALIDATION_ERROR` | `{ "_root": "no_fields" }` |

## 境界条件

- `title` = 1 文字（下限ちょうど）: 受け付ける。
- `title` = 200 文字（上限ちょうど）: 受け付ける。
- `title` = 201 文字: `422` を返す。
- `title` = 0 文字（空文字）: `422` を返す。
- 前後空白のみの `title`: トリム後 0 文字で `422`。
- `description` = 0 文字（空文字）: 受け付ける（「説明なし」）。
- `description` = 2000 文字（上限ちょうど）: 受け付ける。
- `description` = 2001 文字: `422` を返す。
- カード 0 件のリスト: 一覧 API は `{ "items": [] }` を `200` で返す。画面は空状態を表示する。
- カード削除直後に同 ID を GET / PATCH / DELETE すると `404` を返す。

## バリデーション

| フィールド | 必須 | ルール |
|---|---|---|
| `title` | はい | 文字列。前後の半角・全角空白、タブ、改行を除去した後 1〜200 文字。 |
| `description` | いいえ | 文字列。0〜2000 文字。省略時は空文字を保存。 |
| `listId`（パス） | はい | 文字列。存在しなければ `404`。閲覧不可でも `404`。 |
| `cardId`（パス） | はい | 文字列。存在しなければ `404`。閲覧不可でも `404`。 |

作成 API では `id` / `order` / `createdAt` / `updatedAt` はクライアントから受け取らない。
更新 API で受け付けるのは `title` と `description` のみ。

## 権限境界

| 操作 | 必要権限 | 権限不足時の挙動 |
|---|---|---|
| カード一覧取得（`GET /api/lists/{id}/cards`） | 所属ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |
| カード詳細取得（`GET /api/cards/{id}`） | 所属ボードの `viewer` 以上 | 未ログイン `401`、閲覧不可 `404` |
| カード作成（`POST /api/lists/{id}/cards`） | 所属ボードの `member` 以上 | 未ログイン `401`、閲覧不可 `404`、`viewer` は `403` |
| カード更新（`PATCH /api/cards/{id}`） | 所属ボードの `member` 以上 | 同上 |
| カード削除（`DELETE /api/cards/{id}`） | 所属ボードの `member` 以上 | 同上 |

## 非機能要件

`spec/000_shared_rules.md § 非機能要件` に従う。Card 固有の追加要件は無し。

## 使用する用語

- カード（Card）（`constitution.md § 用語集` 参照）

## 参照する既存ファイル

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `inputs/001_core_kanban_spec_input.md`

## 未決事項

- カード並び替え API（`order` の変更）は本 spec の対象外とし、別 spec で扱う。
- 削除確認ダイアログの文言、モーダルレイアウト、空状態の文言は `ui-design/` で決める。
- ラベル、期限、担当者、コメントは本章 03 以降のセクションで拡張する。
