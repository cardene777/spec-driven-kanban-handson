# ラベル機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/003_cards.md`
- `spec/005_card_detail.md`
- `spec/006_label.md`

## 前提

Prisma 全体スキーマ、 認証・認可の共通ユーティリティ (`getCurrentUser` / `assertBoardAccess`)、 エラーレスポンスヘルパ、 監査ログ形式、 バリデーション方針 (zod) は `design/001_boards.md § 共通設計方針` を参照する。 Card エンティティと `resolveBoardFromCard(cardId)` は `design/003_cards.md § データモデル` を参照する。 本 file はラベル (Label) と CardLabel 関連固有の設計のみ記述する。

## データモデル

### Label モデル (新設)

```prisma
model Label {
  id        String   @id @default(cuid())
  boardId   String
  name      String
  color     LabelColor
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board     Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cardLabels CardLabel[]

  @@unique([boardId, name])
  @@index([boardId])
}

enum LabelColor {
  red
  orange
  yellow
  green
  blue
  purple
  pink
  gray
}
```

- `name` はアプリ層でトリム済み 1〜50 文字を保証。 DB 制約による長さ検証は行わない。
- `@@unique([boardId, name])` により同一ボード内での `name` 重複を DB 側で禁止する (`spec/006_label.md § 境界条件`)。
- `color` は Prisma enum `LabelColor` として 8 色を固定 (`spec/006_label.md § 事前定義された色パレット`)。 SQLite 上は文字列として保存されるが、 Prisma 層で列挙値を強制する。
- Board 削除で Label がカスケード削除、 それに伴い `CardLabel` もカスケード削除 (下記)。

### CardLabel モデル (中間テーブル、 新設)

```prisma
model CardLabel {
  cardId    String
  labelId   String
  createdAt DateTime @default(now())

  card      Card  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  label     Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([cardId, labelId])
  @@index([labelId])
}
```

- 複合主キー `(cardId, labelId)` により付与の一意性を DB 側で保証する (`spec/006_label.md § 対象データ`)。
- `onDelete: Cascade` により Card / Label いずれかの削除で関連レコードが自動的に消える (`spec/006_label.md § 操作: ラベル削除` の「全カードへの付与関連を同時に解除」 に一致)。

### Card モデルへの relation 追加

`design/003_cards.md § データモデル` の `Card` に `cardLabels` relation を追加する (`design/005_card_detail.md` で追加した `assigneeId` / `comments` と併存)。

```prisma
model Card {
  // ...既存フィールド
  cardLabels  CardLabel[]
  // ...
}
```

### Board モデルへの relation 追加

`design/001_boards.md § データモデル` の `Board` に `labels` relation を追加する。

```prisma
model Board {
  // ...既存フィールド
  labels      Label[]
  // ...
}
```

### 補助クエリ

- `resolveBoardFromLabel(labelId)` = `prisma.label.findUnique({ where: { id: labelId }, select: { id: true, boardId: true } })` を `lib/auth/labelAccess.ts` に配置する。
- 未存在は `NotFoundError` を throw する。

### JSON 表現

Label レスポンス。

```json
{
  "id": "lbl_abc",
  "boardId": "clx...",
  "name": "urgent",
  "color": "red",
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

一覧 API は `{ items: Label[] }` を返す。

CardLabel 関連は独立リソースとしては露出させず、 `GET /api/cards/{cardId}/labels` は `{ items: Label[] }` を返す (中間テーブルの生表現は返さない)。

## API 設計

`spec/006_label.md § API` の 7 endpoint を Route Handler で実装する。 file 配置。

- `app/api/boards/[boardId]/labels/route.ts` … `GET` / `POST`
- `app/api/labels/[labelId]/route.ts` … `PATCH` / `DELETE`
- `app/api/cards/[cardId]/labels/route.ts` … `GET`
- `app/api/cards/[cardId]/labels/[labelId]/route.ts` … `POST` / `DELETE`

### `GET /api/boards/{boardId}/labels` 一覧取得

- 入力 = パスパラメータ `boardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `assertBoardAccess(userId, boardId, "viewer")`。
  2. `prisma.label.findMany({ where: { boardId }, orderBy: [{ name: "asc" }, { createdAt: "asc" }] })`。
- 出力 = `200 { items: Label[] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=label.list`、 `context={ boardId, count }`。

### `POST /api/boards/{boardId}/labels` 新規作成

- 入力 = パスパラメータ `boardId`、 body = `{ name: string, color: LabelColor }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション。
  - `name` = 文字列。 トリム後 1〜50 文字。 違反時 `422 { name: "required" | "too_long" | "invalid_type" }`。
  - `color` = 8 色のいずれか (小文字固定)。 違反時 `422 { color: "required" | "invalid_color" | "invalid_type" }`。
- 処理。
  1. `assertBoardAccess(userId, boardId, "member")`。
  2. body を zod 検証。
  3. `prisma.label.create({ data: { boardId, name, color } })` を実行。 Prisma の一意制約違反 (`P2002`) を catch して `422 { name: "duplicate_name" }` に変換する。
- 出力 = `201 Label`。
- ステータス = `201` / `401` / `403` / `404` / `422`。
- ログ = `event=label.create`、 `targetId=新規 labelId`、 `context={ boardId, name, color }`。

### `PATCH /api/labels/{labelId}` 編集

- 入力 = パスパラメータ `labelId`、 body = `{ name?: string, color?: LabelColor }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション。
  - `name` 指定時 = 文字列。 トリム後 1〜50 文字。
  - `color` 指定時 = 8 色のいずれか。
  - 両方未指定 = `422 { _: "no_updates" }`。
- 処理。
  1. `label = resolveBoardFromLabel(labelId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, label.boardId, "member")`。
  3. body を zod 検証。
  4. `prisma.label.update({ where: { id: labelId }, data: { ...(name !== undefined ? { name } : {}), ...(color !== undefined ? { color } : {}) } })`。 一意制約違反時は `422 duplicate_name`。
- 出力 = `200 Label`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=label.update`、 `targetId=labelId`、 `context={ boardId, changedFields: ["name", "color"] }` (旧値 / 新値もサイズ次第で記録)。

### `DELETE /api/labels/{labelId}` 削除

- 入力 = パスパラメータ `labelId` (body なし)。
- 権限 = 対象ボードの `member` 以上。
- 処理。
  1. `label = resolveBoardFromLabel(labelId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, label.boardId, "member")`。
  3. 削除前に `deletedCardLabelCount = prisma.cardLabel.count({ where: { labelId } })` を取得 (監査ログ用)。
  4. `prisma.label.delete({ where: { id: labelId } })`。 `CardLabel` は `onDelete: Cascade` で自動消去。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=label.delete`、 `targetId=labelId`、 `context={ boardId, name, color, deletedCardLabelCount }`。

### `GET /api/cards/{cardId}/labels` カード配下のラベル一覧

- 入力 = パスパラメータ `cardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "viewer")`。
  3. `prisma.label.findMany({ where: { cardLabels: { some: { cardId } } }, orderBy: [{ name: "asc" }] })`。
- 出力 = `200 { items: Label[] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=card.label.list`、 `context={ cardId, boardId, count }`。

### `POST /api/cards/{cardId}/labels/{labelId}` ラベル付与

- 入力 = パスパラメータ `cardId` / `labelId` (body なし)。
- 権限 = 対象ボードの `member` 以上、 かつ label と card が同一ボード。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。 `boardId = card.list.boardId`。
  2. `assertBoardAccess(userId, boardId, "member")`。
  3. `label = resolveBoardFromLabel(labelId)`、 未存在なら `404`。 `label.boardId !== boardId` なら `404` (別ボードは「アクセスできないリソース」 として `404`、 `spec/006_label.md § 異常系`)。
  4. `prisma.cardLabel.upsert({ where: { cardId_labelId: { cardId, labelId } }, create: { cardId, labelId }, update: {} })` で idempotent に付与する。
  5. Card の `updatedAt` を明示更新 (`spec/006_label.md § 操作: カードへのラベル付与`)。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=card.label.attach`、 `context={ cardId, labelId, boardId }`。

### `DELETE /api/cards/{cardId}/labels/{labelId}` ラベル解除

- 入力 = パスパラメータ `cardId` / `labelId`。
- 権限 = 対象ボードの `member` 以上、 かつ label と card が同一ボード。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "member")`。
  3. `label = resolveBoardFromLabel(labelId)`、 未存在なら `404`。 別ボードなら `404`。
  4. `prisma.cardLabel.deleteMany({ where: { cardId, labelId } })` を実行 (未付与でも `deleteMany` は 0 件削除で成功、 idempotent)。
  5. Card の `updatedAt` を明示更新。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=card.label.detach`、 `context={ cardId, labelId, boardId }`。

### 既存 Card API との連携

- `GET /api/cards/{cardId}` レスポンスに `labels: Label[]` を含めるかは設計判断。 本設計では**含めない**方針とし、 カードモーダル側で `GET /api/cards/{cardId}/labels` を別途叩く。 理由 = `GET /api/lists/{listId}/cards` のリスト一覧レスポンスにラベルを含めると N+1 になり性能懸念、 詳細取得と一覧取得で経路を統一するため。
- リスト内カード一覧でラベルバッジを表示するため、 `GET /api/lists/{listId}/cards` は Prisma の `include: { cardLabels: { include: { label: true } } }` でラベルを 1 クエリで JOIN 取得し、 レスポンスに `labels: Label[]` を含める。 単発 `GET /api/cards/{cardId}` も同様に `labels` を含める形に統一する (前段の記述と矛盾するため、 本設計は含める形に統一 = リスト一覧側で必ずラベル表示が必要なため)。

## UI 構造

### 配置

- `design/003_cards.md § UI 構造` の `CardRow` にラベルバッジ表示領域を追加する。
- `design/005_card_detail.md § UI 構造` の `CardDetailModal` にラベル領域 (`CardLabelsField`) を追加する。
- ボード詳細画面 (`app/boards/[boardId]/page.tsx`) にラベル管理 UI (`BoardLabelsPanel`) の導線を追加する (パネル / モーダル形式は `ui-design/` で決める)。

### 主要 Client Component (追加分)

| コンポーネント | 責務 |
|---|---|
| `BoardLabelsPanel` | ボード単位のラベル一覧、 新規作成 form、 各行の編集 / 削除導線。 `GET/POST/PATCH/DELETE /api/boards/{boardId}/labels` を叩く。 |
| `LabelRow` | 1 ラベル行 (name + color プレビュー + 編集 / 削除)。 |
| `LabelEditForm` | インライン編集 form。 `PATCH /api/labels/{labelId}` を叩く。 |
| `LabelDeleteConfirm` | 削除確認 (`window.confirm` で初期実装)。 |
| `CardLabelsField` | カード詳細モーダルのラベル領域。 付与済みバッジ + トグル型セレクタ。 `POST/DELETE /api/cards/{cardId}/labels/{labelId}` を叩く。 |
| `CardLabelBadge` | 1 バッジ (色 + name)。 `CardRow` と `CardLabelsField` で共通利用。 |

### 楽観的更新

- ラベル付与 / 解除は楽観的更新を採用する。 UI 側でトグル → API 呼出 → 失敗時ロールバック (`spec/006_label.md § 画面レベル`)。
- ラベル削除は「削除確認 → API 成功後にラベル一覧と各カードのバッジから消える」 経路。 楽観的削除は初期実装で採用しない (削除は影響範囲が広く、 rollback が複雑になるため)。

### 空状態

- ラベル管理画面 0 件 = `BoardLabelsPanel` 内で「まだラベルがありません」 空状態 + 新規作成導線を強調。
- カードのラベル 0 件 = `CardLabelsField` 内で「ラベルなし」 プレースホルダ。

## 状態遷移

### エンティティ状態

Label。

```
[存在せず]  --POST-->   [存在]
[存在]      --PATCH-->  [存在 (name/color 更新, updatedAt 更新)]
[存在]      --DELETE--> [存在せず] + [CardLabel 全消え (cascade)]
[Board 削除] --Cascade--> [存在せず]
```

CardLabel。

```
[存在せず]  --POST /api/cards/{cardId}/labels/{labelId}-->  [存在]
[存在]      --再度 POST-->                                   [存在] (upsert で状態変わらず、 204)
[存在]      --DELETE-->                                      [存在せず]
[存在せず]  --DELETE-->                                      [存在せず] (deleteMany 0 件、 204)
[Card 削除] --Cascade-->                                     [存在せず]
[Label 削除] --Cascade-->                                    [存在せず]
```

### UI 状態遷移 (ラベル領域)

```
モーダル open → CardLabelsField fetch (GET /api/cards/{cardId}/labels)
→ idle
→ トグル (attach) → optimistic-update (バッジ追加) → POST → success → idle
                                                 ↘ error → rollback (バッジ削除)
→ トグル (detach) → optimistic-update (バッジ削除) → DELETE → success → idle
                                                  ↘ error → rollback (バッジ追加)
```

## 非機能の実装方針

### 性能

- ラベル一覧 = `@@index([boardId])` + `orderBy: name` で P95 200ms 以内。
- カード配下ラベル一覧 = `CardLabel` 経由の JOIN 1 本 (`cardLabels: { some: { cardId } }`) で P95 200ms 以内。
- カード一覧レスポンスにラベルを include する場合、 N+1 を避けるため `include: { cardLabels: { include: { label: true } } }` を 1 クエリで発行する。 SQLite ローカル環境 + 1 ボードあたり数十カード規模なら性能問題なし。
- 付与 / 解除は複合主キー 1 行の upsert / deleteMany のみ。 P95 300ms 以内。

### セキュリティ

- 別ボードのラベルをカードに付与しようとした場合、 `resolveBoardFromLabel` で `boardId` を取得してから card の `boardId` と比較し、 一致しなければ `404` を返す (`spec/006_label.md § 異常系` の判断)。 「存在有無を漏らさない」 方針と整合。
- ラベル `color` は Prisma enum で 8 色に固定。 API 層と DB 層の両方で列挙外の値を拒否する二重防御。
- 一意制約違反 (`P2002`) は Prisma の型エラーコードで catch する経路を `lib/http/prismaErrors.ts` に集約する (将来他モデルで再利用可能)。

### 運用

- ラベル削除時は `deletedCardLabelCount` (カスケードで消えた `CardLabel` 数) を context に残す。 削除の影響範囲を追跡可能にする。
- ラベル付与 / 解除は `cardId` と `labelId` を両方 context に残す。 特定カードに対するラベル操作履歴を検索できる。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/boards/{boardId}/labels` | `assertBoardAccess(userId, boardId, "viewer")` | 未認証 `401`、 未存在 / 閲覧不可 `404` |
| `POST /api/boards/{boardId}/labels` | `assertBoardAccess(userId, boardId, "member")` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403` |
| `PATCH /api/labels/{labelId}` | `resolveBoardFromLabel` → `assertBoardAccess(userId, label.boardId, "member")` | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403` |
| `DELETE /api/labels/{labelId}` | 同上 | 同上 |
| `GET /api/cards/{cardId}/labels` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "viewer")` | 未認証 `401`、 未存在 / 閲覧不可 `404` |
| `POST /api/cards/{cardId}/labels/{labelId}` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "member")` + `resolveBoardFromLabel` で同一ボード検証 | 未認証 `401`、 未存在 / 閲覧不可 / 別ボード label `404`、 `viewer` は `403` |
| `DELETE /api/cards/{cardId}/labels/{labelId}` | 同上 | 同上 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `label.list` 成功 | `info` | `actorId`、 `context={ boardId, count }`、 `status=200` |
| `label.create` 成功 | `info` | `actorId`、 `targetId=新規 labelId`、 `context={ boardId, name, color }`、 `status=201` |
| `label.update` 成功 | `info` | `actorId`、 `targetId=labelId`、 `context={ boardId, changedFields, oldName?, newName?, oldColor?, newColor? }`、 `status=200` |
| `label.delete` 成功 | `info` | `actorId`、 `targetId=labelId`、 `context={ boardId, name, color, deletedCardLabelCount }`、 `status=204` |
| `card.label.list` 成功 | `info` | `actorId`、 `context={ cardId, boardId, count }`、 `status=200` |
| `card.label.attach` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ labelId, boardId }`、 `status=204` |
| `card.label.detach` 成功 | `info` | `actorId`、 `targetId=cardId`、 `context={ labelId, boardId }`、 `status=204` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成 (Board / List / Card 設計と共通)

- 単体テスト … zod スキーマ (`name` / `color`)、 一意制約違反変換 (`prismaErrors.ts`)、 別ボード検証の pure 関数。
- Route Handler テスト … 独立 SQLite テスト DB。 `getCurrentUser` 差し替え。 idempotency (再付与 / 未付与解除) を明示検証。
- UI テスト … `CardLabelsField` の楽観的トグル rollback (優先度中)。

### ケース一覧

| 種別 | ケース例 |
|---|---|
| 正常系 (ラベル CRUD) | 一覧取得 (0 件 / 複数件、 name 昇順)、 作成 (name + 8 色それぞれ)、 name 編集、 color 編集、 両方同時編集、 削除 |
| 正常系 (付与 / 解除) | 未付与 → 付与 (204、 GET 一覧に含まれる)、 再付与 (204、 状態変わらず)、 付与済 → 解除 (204)、 未付与解除 (204、 idempotent)、 複数ラベル付与 |
| 権限 | `viewer` で label CRUD / 付与 / 解除 = `403`。 未参加ボードの label / card = `404` |
| 未存在 | 存在しない `boardId` / `labelId` / `cardId` で各 API = `404` |
| バリデーション (name) | 空 / トリム後 0 / 51 文字 = `422`。 型不一致 = `422 invalid_type`。 同一ボード重複 = `422 duplicate_name` (作成時 / 編集時) |
| バリデーション (color) | 未指定 (作成時) = `422 required`。 8 色外 (`RED` / `black` 等) = `422 invalid_color`。 型不一致 = `422 invalid_type` |
| バリデーション (編集) | 両方未指定 = `422 no_updates` |
| 別ボード非干渉 | 別ボードの label id を `POST /api/cards/{cardId}/labels/{labelId}` に指定 = `404`。 別ボードの card / label で `name` 重複は許可 |
| 境界 | name = 1 / 50 文字、 51 文字で `422`。 大文字小文字 (`Bug` / `bug`) は別ラベルとして許可 (SQLite 既定挙動) |
| カスケード | Label 削除で `CardLabel` 全消え、 Card 詳細取得で該当ラベル消失。 Board 削除で Label + CardLabel 全消え |
| 一意性 | 同一 `(cardId, labelId)` の付与を並列に 2 回実行しても最終状態は 1 レコード (upsert 挙動検証) |

### 補助ヘルパ

- `tests/helpers/factories.ts` に `createLabel(board, {name, color?})` / `attachLabel(card, label)` を追加する。
- 8 色それぞれで作成が通る smoke test を配列 iteration で書く。

## 実装方針 (本設計で固定する判断)

- ラベル `color` は Prisma enum で 8 色を固定する。 カスタムカラー (HEX 直指定) は本 spec 外 (`spec/006_label.md § 未決事項`)。
- ラベル `name` の同一ボード内一意性は `@@unique([boardId, name])` で DB 側に強制する。 大文字小文字は SQLite 既定の区別あり挙動を採用する (正規化は行わない、 `spec/006_label.md § 境界条件` の初期方針)。
- ラベル付与 / 解除は `POST/DELETE /api/cards/{cardId}/labels/{labelId}` のリソース指向 URL を採用する。 body なしで idempotent、 `204 No Content` を返す。
- 付与時の一意性は Prisma `upsert` で担保する (未付与→挿入、 付与済み→no-op)。 解除は `deleteMany` で 0 件削除も成功として扱う。
- `GET /api/lists/{listId}/cards` および `GET /api/cards/{cardId}` のレスポンスに `labels: Label[]` を include する。 include 経路は Prisma の `include: { cardLabels: { include: { label: true } } }` を薄い adapter (`lib/api/cardWithLabels.ts`) でフラット化して返す。 N+1 を避けるため 1 クエリで完結させる。
- ラベル並び順は `name` 昇順で固定 (`spec/006_label.md § 未決事項` の初期方針)。 手動並び替えは将来別 spec で対応。
- ラベル削除は物理削除、 復元は行わない。 影響を受ける `CardLabel` は `onDelete: Cascade` で自動消去。

## 実装順序

1. **`design/001_boards.md` / `design/002_lists.md` / `design/003_cards.md` / `design/005_card_detail.md` の実装順序を先に完了させる**
   Board / List / Card / 担当者 / コメントの基本 CRUD が本設計の前提。
2. **Prisma スキーマ拡張と migration**
   `Label` モデル + `LabelColor` enum + `CardLabel` モデル + Board / Card の relation 追加を 1 migration で流す。 既存 `@@unique` / `@@index` を破壊しないことを確認する。
   依存 = 手順 1。
3. **共通ユーティリティ**
   - `lib/auth/labelAccess.ts` の `resolveBoardFromLabel(labelId)`。
   - `lib/http/prismaErrors.ts` の一意制約違反 (`P2002`) → `422 duplicate_name` 変換。
   - `lib/api/cardWithLabels.ts` の Prisma include 結果 → API JSON フラット化 adapter。
   - zod スキーマ (`schemas/label.ts`)。
   依存 = 手順 2。
4. **ラベル CRUD API 4 endpoint**
   `GET/POST /api/boards/{boardId}/labels` → `PATCH /api/labels/{labelId}` → `DELETE /api/labels/{labelId}` の順で実装する。 CRUD を先に置くのは付与 / 解除が Label 存在を前提とするため。
   依存 = 手順 3。
5. **ラベル付与 / 解除 API 3 endpoint**
   `GET /api/cards/{cardId}/labels` → `POST /api/cards/{cardId}/labels/{labelId}` → `DELETE /api/cards/{cardId}/labels/{labelId}` の順で実装する。 idempotency と別ボード検証をここで担保する。
   依存 = 手順 4。
6. **既存 Card API レスポンス拡張**
   `GET /api/lists/{listId}/cards` / `GET /api/cards/{cardId}` のレスポンスに `labels: Label[]` を include する。 既存テストで `labels` の存在を assert していない場合は追加する。
   依存 = 手順 5。
7. **UI コンポーネント**
   `BoardLabelsPanel` (管理画面) → `CardLabelsField` (詳細モーダル領域) → `CardRow` へのバッジ表示追加 → `CardLabelBadge` 共通化、 の順で組み込む。 管理画面を先に置くのは、 ラベル 0 件では付与操作の動作確認ができないため。
   依存 = 手順 6。
8. **テスト整備**
   pure 単体テスト (手順 3) → Route Handler テスト (手順 4、 5、 idempotency と別ボード検証を含む) → UI テスト (楽観的トグル rollback) の順で追加する。
   依存 = 手順 3〜7。
