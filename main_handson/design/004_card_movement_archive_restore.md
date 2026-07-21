# カード移動・アーカイブ・削除と復元の設計

## 関連仕様

- spec/004_card_movement_archive_restore.md
- spec/000_shared_rules.md
- spec/002_lists.md / spec/003_cards.md（一本化済み）
- constitution.md

## 前提

- design/001_boards.md / 002_lists.md / 003_cards.md の前提（技術スタック・共通規則・認証未接続）を継承する。
- **Card に状態フィールド `archivedAt` / `deletedAt`（ともに `DateTime?`）を新規追加する（未実装のため要 migration）**。
- **認証・ロール（owner/member/viewer）は既存コア同様に後続機能へ委譲済み**。本設計ではロールチェックの「配置」を定義し、ロール依存の 403 系（purge の owner 限定・member 未満の 403 等）の実挙動接続は auth 機能に委ねる。コア段階では認証・権限は通過し、**状態遷移・並び順再計算・状態不整合の 422 系**を実装・テスト対象とする。
- 共通のエラー応答・一覧レスポンス形状・order/ID/日付/ログ規則は spec/000_shared_rules.md に従う。

## 既存設計との差分

本設計は先行設計 design/003_cards.md の前提を一部変更する（spec 側は spec/003 一本化として承認済み。design/003 本体は本サイクルでは未編集で、下記差分を design/004 を正として実装に反映する）。

- **Card モデル**: design/003 の Card に `archivedAt` / `deletedAt` を追加する（本設計のデータモデルを正）。
- **DELETE /api/cards/[cardId]**: design/003 の物理削除 → 本設計で**ソフト削除**（`deletedAt` 設定）に変更。物理削除は `DELETE /api/cards/[cardId]/purge`（owner）へ分離。
- **GET /api/lists/[listId]/cards**: design/003 の全件返却 → 本設計で**既定 active のみ**、`?status=active|archived|deleted` 対応に変更。ボード詳細画面のカード取得も active のみに変更。
- 上記に伴い `cardRepository` に状態・並び替え系メソッドを追加し、既存 `create` / `update`（title/description/order）/ `findById` は維持する（基本操作を壊さない）。

## データモデル

Prisma スキーマ（Card に2フィールド追加。他は既存のまま）。

```prisma
model Card {
  id          String    @id @default(cuid())
  listId      String
  title       String
  description String    @default("")
  order       Int
  archivedAt  DateTime?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  list List @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@index([listId])
}
```

- 状態は排他: `archivedAt` と `deletedAt` が同時に非 null にはならない（アプリ層の状態遷移で保証。DB 制約は課さず、遷移ロジックで担保）。
- active = 両方 null / archived = archivedAt のみ / deleted = deletedAt のみ。
- リスト削除は既存の `onDelete: Cascade`（design/002）で配下 Card を状態問わず物理削除する（ソフト削除フラグは物理削除を妨げない）。
- 並び順再計算は `where listId` + 状態フィルタでアクティブ集合を取得して行うため、既存 `@@index([listId])` を流用する（少量データ前提で追加インデックスは設けない）。

## API設計

すべて Route Handler。入口チェック順序は「認証 → 対象存在 → 権限 → 入力検証（状態・範囲）」（spec/000_shared_rules.md）。ロール判定はコア段階では通過。

### GET /api/lists/[listId]/cards?status=active|archived|deleted

- 入力: パス `listId`、クエリ `status`（既定 `active`）。
- 存在確認: List なしは 404。
- 検証: `status` が未定義値は 422 / VALIDATION_ERROR。
- 処理: 指定状態のカードを取得（active/archived は `order` 昇順、deleted は `deletedAt` 降順）。
- 出力: `{ items: Card[] }` / 200。
- 権限: viewer 以上。ログ: requestId。

### POST /api/cards/[cardId]/move

- 入力: パス `cardId`、body `{ sourceListId, targetListId, targetOrder }`。
- 存在確認: Card なし・targetList なしは 404。
- 検証（422）: 対象カードが active でない / `sourceListId != card.listId` / `targetList.boardId != sourceList.boardId` / `targetOrder` が整数でない・0未満・範囲超過。
- 処理: § データ更新手順「カード移動」。1 トランザクション。
- 出力: 更新後 Card / 200。権限: member 以上。ログ: `card.move`。

### POST /api/lists/[listId]/move

- 入力: パス `listId`、body `{ targetOrder }`。
- 存在確認: List なしは 404。
- 検証（422）: `targetOrder` が整数でない・0未満・ボード内リスト数超過。
- 処理: § データ更新手順「リスト移動」。1 トランザクション。
- 出力: 更新後 List / 200。権限: member 以上。ログ: `list.move`。

### POST /api/cards/[cardId]/archive / /unarchive

- 存在確認: Card なしは 404。
- archive: deleted 状態は 422。active→archivedAt 設定＋元リスト active 詰め直し。archived への再 archive は冪等 200（無変更）。
- unarchive: archived→archivedAt を null、元リスト末尾へ。active への unarchive は冪等 200。
- 出力: 更新後 Card / 200。権限: member 以上。ログ: `card.archive` / `card.unarchive`。

### DELETE /api/cards/[cardId]（ソフト削除） / POST /api/cards/[cardId]/restore

- 存在確認: Card なしは 404。
- soft delete: archived 状態は 422。active→deletedAt 設定＋元リスト active 詰め直し。deleted への再削除は冪等 200。
- restore: deleted→deletedAt を null、元リスト末尾へ。active への restore は冪等 200。
- 出力: 更新後 Card / 200。権限: member 以上。ログ: `card.softDelete` / `card.restore`。

### DELETE /api/cards/[cardId]/purge

- 存在確認: Card なしは 404。
- 検証: deleted 状態でない（active/archived）は 422。
- 処理: 物理削除（`prisma.card.delete`）。
- 出力: `{ ok: true }` / 200。権限: owner（コア段階は通過、実挙動は auth 機能で接続）。ログ: `card.purge`。

## データ更新手順

### カード移動（同一/別リスト）

トランザクション内で実行:

1. `card = findById(cardId)`。なし→404。active でない→422。
2. `sourceListId != card.listId`→422。`sourceList = findById(card.listId)`。
3. `targetList = findById(targetListId)`。なし→404。`targetList.boardId != sourceList.boardId`→422。
4. 同一リスト（`card.listId == targetListId`）:
   - active カードを `order` 昇順で取得 → 配列 A。
   - A から対象カードを除いた配列 B（長さ = |A|-1）。`targetOrder` 有効範囲 `0..|B|`。範囲外→422。
   - B の `targetOrder` 位置に対象カードを挿入し、先頭から `order` を 0..n-1 で再採番して更新。
5. 別リスト:
   - source の active（対象除く）を取得し `order` を 0..s-1 に詰め直して更新。
   - target の active を取得（長さ t）。`targetOrder` 有効範囲 `0..t`。範囲外→422。
   - 対象カードの `listId` を `targetListId` に更新し、target 配列の `targetOrder` 位置に挿入して `order` を 0..t で再採番して更新。

### リスト移動

トランザクション内で実行:

1. `list = findById(listId)`。なし→404。
2. 同一ボード（`list.boardId`）のリストを `order` 昇順で取得 → 配列。対象を除いた配列に `targetOrder`（有効範囲 `0..len-? `＝挿入可能 `0..(件数-1)`）で挿入。範囲外→422。
3. 先頭から `order` を 0..n-1 で再採番して更新。

### アーカイブ / ソフト削除

1. `card = findById`。なし→404。反対フラグが立つ状態→422。
2. 既に同状態→冪等 200（フラグ・order 変更なし）。
3. フラグ（`archivedAt` or `deletedAt`）に現在時刻を設定。
4. 元リストの残り active を `order` 0..n-1 に詰め直して更新。

### アーカイブ復元 / 削除復元

1. `card = findById`。なし→404。既に active→冪等 200。
2. フラグを null に戻す。
3. `order` = 元リストの現在 active 件数（末尾 index）に設定。

## 並び順の再計算

- アクティブ集合を「`listId` 一致かつ archivedAt=null かつ deletedAt=null」で取得し、`order` 昇順→挿入/除去→**先頭から 0,1,2,… に再採番**する純関数を共通化する（`lib/ordering.ts` 想定）。
- 再採番は対象集合の全要素 `order` を更新する（少量データ前提。差分最小化の最適化は行わない）。
- リスト並びも同様に「`boardId` 一致」集合で 0 始まり再採番する。

## UI構造

- `/boards/[id]`（ボード詳細画面）
  - 領域: ボードヘッダー ＋ リスト列（横並び、active カード）＋ リスト作成 ＋ 「アーカイブ/ゴミ箱」表示切替パネル。
  - **ドラッグ&ドロップ**: カード列・リスト列に HTML5 Drag and Drop（`draggable` + onDragStart/onDragOver/onDrop）を付与し、ドロップ確定時に move / list move API を呼ぶ。状態はドラッグ中のみクライアント保持、確定後はサーバー再取得（`router.refresh()`）で反映。
  - カード詳細モーダル（既存）に「アーカイブ」「削除（ゴミ箱へ）」操作を追加。
  - アーカイブ/ゴミ箱パネル: `?status=archived` / `?status=deleted` を取得し、「復元」（member+）と「完全削除」（owner、コア段階は表示のみ）を配置。
- 状態の所在: サーバー取得データを画面が保持。移動・状態遷移後は再取得で反映。DnD ライブラリ選定・アクセシビリティ詳細は UI 設計に委ねる（本設計は HTML5 DnD を採用方針として固定）。

## 状態遷移

- Card 状態（排他）: active ⇄ archived（archive/unarchive）、active ⇄ deleted（softDelete/restore）、deleted → 物理削除（purge）。
  - archived への softDelete、deleted への archive は不可（422）。
- UI: 通常表示 ⇄ アーカイブ/ゴミ箱パネル。ドラッグ: idle → dragging → drop(API) → idle。

## 非機能の実装方針

### 性能

- 一覧・再採番とも `listId`/`boardId` の単一スコープ取得（index 利用）。P95 一覧 200ms / 書き込み 300ms 以内。
- 再採番は 1 トランザクションで対象集合をまとめて更新。

### セキュリティ

- 別ボードへの移動を 422 で拒否し、スコープ越境を防ぐ。ローカル SQLite・機密データなし。

### 運用

- move/archive/unarchive/softDelete/restore/purge を requestId 付きで操作ログに記録（lib/audit/log）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET .../cards?status | 認証 → List存在 → viewer以上 → status検証 | 401 / 404 / (権限なし)404 / 422 |
| POST .../cards/[id]/move | 認証 → Card/targetList存在 → member → 状態・範囲・ボード検証 | 401 / 404 / 403 / 422 |
| POST .../lists/[id]/move | 認証 → List存在 → member → 範囲検証 | 401 / 404 / 403 / 422 |
| POST .../archive・unarchive | 認証 → Card存在 → member → 状態検証 | 401 / 404 / 403 / 422 |
| DELETE .../cards/[id]（soft）・restore | 認証 → Card存在 → member → 状態検証 | 401 / 404 / 403 / 422 |
| DELETE .../cards/[id]/purge | 認証 → Card存在 → **owner** → 状態検証 | 401 / 404 / 403 / 422 |

（コア段階ではロール解決未接続のため owner/member 判定は通過。順序と 422 系は実装する。ロール依存 403 の実挙動は auth 機能で接続。）

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| カード移動 | info | requestId, card.move, cardId, sourceListId, targetListId, targetOrder |
| リスト移動 | info | requestId, list.move, listId, targetOrder |
| アーカイブ/復元 | info | requestId, 操作種別, cardId |
| ソフト削除/復元 | info | requestId, 操作種別, cardId |
| 完全削除 | info | requestId, card.purge, cardId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- **ドラッグ&ドロップは HTML5 Drag and Drop API を採用**（依存追加なしで constitution の技術スタック内に収める）。外部 DnD ライブラリは本コアでは導入しない（理由: 依存を増やさず、並び順の正はサーバー再計算で担保できるため）。
- **並び順は 0 始まり連番をサーバー側で全再採番**する方式に固定（クライアントの order は信頼せず、targetOrder（挿入 index）のみ受け取る。理由: 同時更新でも last-write-wins で整合）。
- 状態は排他をアプリ層で保証（archived への delete / deleted への archive を 422 で弾く）。DB の CHECK 制約は用いない（SQLite/Prisma の可搬性優先）。
- purge は deleted 限定・owner 権限。ロール実挙動は auth 機能へ委譲（コア段階は配置のみ）。
- 既存 `create`/`update`/`findById`/基本 CRUD・画面は壊さず、状態フィルタと新エンドポイントを追加する。

## テスト方針

- Vitest 4、既存 `tests/api/kanban.test.ts` の in-memory Prisma mock を拡張（`archivedAt`/`deletedAt`、`updateMany` 相当、`$transaction`）。DB 不要。
- ロール依存 403 は auth 未接続のため対象外（既存コア同様）。状態・並び替え・範囲の 422、状態遷移、冪等、cascade を検証。
- ケース例:
  - move: 同一リスト並べ替え（先頭/末尾/同位置）→ order 再採番、別リスト移動 → listId 変更＋両リスト再採番、空リストへ、範囲外 422、sourceList 不一致 422、別ボード 422、archived/deleted カード 422、存在なし 404。
  - list move: 再採番、範囲外 422。
  - archive/unarchive/softDelete/restore: フラグ設定・GET(active) から除外、末尾復元の order、冪等（タイムスタンプ不変）、archived への delete=422 / deleted への archive=422。
  - GET status: active 既定、archived/deleted フィルタ、未定義値 422。
  - purge: deleted に対し物理削除 200、非 deleted 422。
  - 既存の boards/lists/cards 基本操作テストが引き続き PASS すること（回帰防止）。

## 実装順序

1. Prisma スキーマ更新（`archivedAt`/`deletedAt`）＋ migration。理由: API・テストが依存。
2. 共通部品: `lib/ordering.ts`（0 始まり再採番の純関数）、`validateOrder` 拡張（0以上整数）。理由: move/状態遷移が依存。
3. `cardRepository` / `listRepository` 拡張（status 取得、move、archive/unarchive/softDelete/restore/purge、reorder）。理由: API が依存。
4. Route Handler 追加/更新（move・list move・archive・unarchive・DELETE soft・restore・purge・GET status）。既存 GET/DELETE の意味変更を反映。理由: 共通部品・リポジトリに依存。
5. UI: ボード詳細の DnD、モーダルのアーカイブ/削除、アーカイブ/ゴミ箱パネル。理由: API 完成後に接続。
6. テスト拡張。理由: 実装確定後に検証・回帰防止。

## 未決事項

- ロールベースの 403 実挙動（purge の owner 限定・member 未満の 403）は auth 機能で接続する。
- 楽観ロック（version 列）導入は将来要件次第（現状 last-write-wins）。
- アーカイブ/ゴミ箱の保持期間・自動 purge は現状なし。
