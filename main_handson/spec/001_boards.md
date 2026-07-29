# ボード（Board）の仕様

## 概要

カンバンアプリの最上位単位である「ボード」の一覧表示・作成・名称編集・削除を定義する。

## 既存仕様との関係

- 共通規約は `spec/000_shared_rules.md` を参照する。
- ボードはリスト（`spec/002_lists.md`）を内包する。

## 対象データ

- Board
  - `id`: string（サーバー採番）
  - `title`: string（1〜100文字）
  - `order`: integer（採番は全体スコープ。一覧はメンバーであるボードに絞るため連番の連続性は保証しない）
  - `createdAt`: datetime
  - `updatedAt`: datetime

## 機能要件

### 操作: ボード一覧取得

- **認証ユーザーがメンバーであるボードのみ**を `order` 昇順で取得する（`spec/013_permissions.md` の BoardMembership に基づく）。他ユーザーのみがメンバーのボードは含めない。
- 連番の連続性は保証しない（`spec/000_shared_rules.md` § order 規則）。

### 操作: ボード作成

- `title` を指定して新規ボードを作成する。**認証済みユーザーであれば誰でも作成できる**（作成前のボードには owner が存在しないため、ロールによる判定は行わない）。
- 作成と同時に、**作成者を `owner` とする BoardMembership を作成する**（同一トランザクション。`spec/013_permissions.md`）。
- `order` は既存最大 + 1 を採番する。

### 操作: ボード名編集

- 対象ボードの `title` を更新する。

### 操作: ボード削除

- 対象ボードを削除する。配下のリスト・カードに加えて、そのボードの **BoardMembership と Invite も削除する**（`spec/000_shared_rules.md` § 削除の連鎖）。

## 画面

- `/`（ボード一覧画面）
  - ボードを `order` 昇順のカード一覧で表示する。
  - 各ボードは詳細（`/boards/[id]`）へ遷移できる。
  - ボード作成フォーム（`title` 入力）を持つ。
  - ボードが 0 件のとき空状態を表示する。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards | ボード一覧取得（メンバーであるボードのみ） | 認証済み |
| POST | /api/boards | ボード作成（作成者が owner になる） | 認証済み（ロール不問） |
| PATCH | /api/boards/[boardId] | ボード名編集 | owner |
| DELETE | /api/boards/[boardId] | ボード削除 | owner |

## 受入条件

- [ ] GET /api/boards は `{ items: [...] }` 形状で 200 を返す
- [ ] GET /api/boards は items を `order` 昇順で返す
- [ ] GET /api/boards は認証ユーザーがメンバーであるボードのみを返し、他ユーザーのみがメンバーのボードは items に含まれない
- [ ] 未認証で GET /api/boards を呼ぶと 401 / UNAUTHORIZED を返す
- [ ] メンバーであるボードが 0 件のとき GET /api/boards は `{ items: [] }` を 200 で返す
- [ ] POST /api/boards に有効な `title` を渡すと 201 で作成済みボードを返す
- [ ] POST /api/boards は認証済みであればロールに関わらず成功する（403 を返さない）
- [ ] POST /api/boards の直後、作成者を `owner` とする BoardMembership が作成されている
- [ ] POST /api/boards の直後、作成者が GET /api/boards/[boardId] を呼ぶと 200 を返す
- [ ] 未認証で POST /api/boards を呼ぶと 401 / UNAUTHORIZED を返す
- [ ] POST /api/boards で作成したボードの `order` は既存最大 + 1 になる
- [ ] POST /api/boards に空文字 `title` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] POST /api/boards に101文字の `title` を渡すと 422 / VALIDATION_ERROR を返す
- [ ] PATCH /api/boards/[boardId] に有効な `title` を渡すと 200 で更新済みボードを返す
- [ ] PATCH /api/boards/[boardId] で存在しない ID を指定すると 404 / NOT_FOUND を返す
- [ ] DELETE /api/boards/[boardId] は 200（または 204）を返し、配下のリスト・カードも削除される
- [ ] DELETE /api/boards/[boardId] 後、そのボードの BoardMembership と Invite も削除される
- [ ] DELETE /api/boards/[boardId] 後、そのボードの招待 token で承認すると 404 / NOT_FOUND を返す
- [ ] DELETE /api/boards/[boardId] で存在しない ID を指定すると 404 / NOT_FOUND を返す

## 異常系

- 存在しない `boardId` を指定した編集・削除は 404 / NOT_FOUND。
- `title` が空文字・上限超過は 422 / VALIDATION_ERROR。
- 未認証は 401 / UNAUTHORIZED。
- owner 権限のないボード操作は 403 / FORBIDDEN（閲覧権限もない場合は 404）。

## 境界条件

- `title` 1文字: 許可。
- `title` 100文字: 許可。
- `title` 0文字（空）: 422。
- `title` 101文字: 422。

## バリデーション

- `title`: 必須、1〜100文字。空文字・上限超過は 422 / VALIDATION_ERROR。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| ボード一覧取得 | 認証済み（メンバーであるボードのみ返す） | 未認証は 401 |
| ボード詳細閲覧 | viewer 以上 | 非メンバーは 404、未認証は 401 |
| ボード作成 | 認証済み（ロール不問。作成者が owner になる） | 未認証は 401 |
| ボード名編集 | owner | 権限不足は 403、未認証は 401、存在なしは 404 |
| ボード削除 | owner | 権限不足は 403、未認証は 401、存在なしは 404 |

## 非機能要件

- 一覧取得APIの応答時間は200ms以内（constitution.md § 性能）。
- 書き込みAPIの応答時間は300ms以内（constitution.md § 性能）。
- 操作ログ・エラーログにリクエスト ID を付与する（spec/000_shared_rules.md § ログ方針）。

## 使用する用語

- ボード（Board）（constitution.md § 用語集 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/011_auth.md（認証・セッション）
- spec/012_member_invite.md（招待の cascade 削除）
- spec/013_permissions.md（BoardMembership・ロール判定）
- inputs/001_core_kanban_spec_input.md

## 未決事項

- なし
