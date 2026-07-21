# ラベルの設計

## 関連仕様

- spec/006_label.md / spec/001_boards.md / spec/003_cards.md / spec/005_card_detail.md
- spec/000_shared_rules.md / constitution.md

## 前提

- design/001-004 の前提を継承する。
- **Label / CardLabel を新規追加する（未実装のため要 migration）**。
- 認証・ロールは後続 auth 機能へ委譲（配置のみ、コア段階は通過）。

## データモデル

```prisma
enum LabelColor {
  gray
  red
  orange
  yellow
  green
  blue
  purple
  pink
}

model Label {
  id        String   @id @default(cuid())
  boardId   String
  name      String
  color     LabelColor
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board      Board       @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cardLabels CardLabel[]

  @@index([boardId])
}

model CardLabel {
  id      String @id @default(cuid())
  cardId  String
  labelId String

  card  Card  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@unique([cardId, labelId])
  @@index([cardId])
  @@index([labelId])
}
```

- Board / Card 側に `labels CardLabel[]` のリレーションを追加する（Board→Label→CardLabel、Card→CardLabel、いずれも `onDelete: Cascade`）。
- 事前定義色は `LabelColor` enum で固定（spec/006）。enum 外は Prisma 型で弾かれるが、入力検証でも 422 を返す。
- ボード削除で Label→CardLabel が cascade、カード削除で CardLabel が cascade。

## API設計

すべて Route Handler。入口チェック順序は「認証 → 対象存在 → 権限 → 入力検証」。

### GET /api/boards/[boardId]/labels

- Board 存在確認（404）。ラベルを `createdAt` 昇順で取得。`{ items }` / 200。viewer 以上。

### POST /api/boards/[boardId]/labels

- 入力 `{ name, color }`。Board 存在（404）。検証: `name` 1〜50（422）、`color` ∈ LabelColor（422）。作成 / 201。member 以上。ログ `label.create`。

### PATCH /api/labels/[labelId]

- 入力 `{ name?, color? }`。Label 存在（404）。検証同上（422）。更新 / 200。member 以上。ログ `label.update`。

### DELETE /api/labels/[labelId]

- Label 存在（404）。削除（CardLabel は cascade 解除）。`{ ok: true }` / 200。member 以上。ログ `label.delete`。

### POST /api/cards/[cardId]/labels

- 入力 `{ labelId }`。Card 存在（404）、Label 存在かつ同一ボード（404）。既付与なら冪等（200・重複作成なし）、未付与なら作成 / 201。member 以上。ログ `label.assign`。

### DELETE /api/cards/[cardId]/labels/[labelId]

- Card 存在（404）。付与（CardLabel）を削除。未付与でも冪等 200。`{ ok: true }`。member 以上。ログ `label.unassign`。

## UI構造（画面状態）

- カード詳細モーダルのラベル領域：付与済みチップ表示、ラベル選択パネルで付与/解除。ボードのラベル 0 件は「ラベルなし」。
- ボード設定的なラベル管理 UI（作成/編集/削除）は最小構成。部品階層は `/ui-design` に委ねる。
- 画面状態: ラベル選択パネル 閉⇄開、付与/解除の即時反映（router.refresh）。

## 状態遷移

- Label: 作成 →（編集）→ 削除。
- CardLabel: 未付与 ⇄ 付与（付与/解除）。同一 (cardId,labelId) は 1 件のみ。

## 非機能の実装方針

### 性能

- 一覧は `where boardId` 単一クエリ（`@@index([boardId])`）。付与/解除は 1 件更新。P95 一覧 200ms / 書き込み 300ms 以内。

### セキュリティ

- 付与時に Label が対象カードのボードに属することを確認し、越境付与を防ぐ。

### 運用

- 作成/編集/削除/付与/解除を requestId 付きで操作ログに記録。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET labels | 認証 → Board存在 → viewer以上 | 401 / 404 / (権限なし)404 |
| POST/PATCH/DELETE label | 認証 → 対象存在 → member → 検証 | 401 / 404 / 403 / 422 |
| assign/unassign | 認証 → Card/Label存在 → member | 401 / 404 / 403 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| ラベル作成/編集/削除 | info | requestId, 操作種別, boardId, labelId |
| ラベル付与/解除 | info | requestId, 操作種別, cardId, labelId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- `color` は Prisma enum `LabelColor` を採用し、入力検証（許可コード集合）でも 422 を返す二重防御（理由: DB 型と API 応答の一貫性）。
- 付与は「存在すれば作らない」冪等 upsert 相当（`findUnique(cardId_labelId)` → なければ create）。
- ラベル削除・カード削除・ボード削除の連鎖は Prisma `onDelete: Cascade` に委ねる。

## テスト方針

- Vitest、in-memory mock に label / cardLabel テーブルを追加。cascade（board/card 削除で CardLabel 解除）を再現。
- ケース: ラベル CRUD（name 空/51文字 422、color 不正 422、404）、付与（正常・重複冪等・存在なし404）、解除（正常・未付与冪等）、削除で付与解除。

## 実装順序

1. Prisma に Label/CardLabel/enum 追加 ＋ migration。理由: API・他機能が依存。
2. `labelRepository`（CRUD・assign/unassign）。
3. Route Handler 追加。
4. UI（詳細モーダルのラベル領域、ラベル管理）接続。
5. テスト。

## 未決事項

- ラベル管理専用画面の要否（現状は詳細モーダル内＋最小管理）。
