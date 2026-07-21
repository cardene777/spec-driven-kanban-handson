# カード（Card）の設計

## 関連仕様

- spec/000_shared_rules.md
- spec/003_cards.md
- spec/002_lists.md
- constitution.md

## 前提

- design/001_boards.md・design/002_lists.md の前提（技術スタック・認証未接続・共通規則）を継承する。
- Card は List に属する。Board→List→Card の cascade 削除で末端。
- 認証・権限の実ロール解決は後続機能で接続（コア段階は通過）。

## データモデル

```prisma
model Card {
  id          String   @id @default(cuid())
  listId      String
  list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  title       String
  description String   @default("")
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([listId])
}
```

- `title`: 1〜200文字。
- `description`: 0〜2000文字。デフォルト空文字（省略時 `""`）。
- `order`: 同一 `listId` 内の昇順。作成時は同一リスト内既存最大 + 1（0 件なら 0）。
- List 削除時に cascade 削除。

## API設計

### GET /api/lists/[listId]/cards — カード一覧取得

- 入力: パス `listId`。
- 存在確認: List なしは 404 / NOT_FOUND。
- 処理: 該当 List の Card を `order` 昇順で取得。
- 出力: `{ items: Card[] }`。
- ステータス: 200。
- 権限: viewer 以上。
- ログ: requestId を操作ログに記録。

### POST /api/lists/[listId]/cards — カード作成

- 入力: パス `listId`、body `{ title: string, description?: string }`。
- 存在確認: List なしは 404。
- 検証: `title` 1〜200文字（違反 422）。`description` 0〜2000文字（違反 422）。省略時 `description` は `""`。
- 処理: `order` = 同一リスト内既存最大 + 1 を採番して作成。
- 出力: 作成した Card。
- ステータス: 201。
- 権限: member 以上。失敗時 401/403。
- ログ: requestId・cardId を操作ログに記録。

### PATCH /api/cards/[cardId] — カードタイトル・説明文編集・並び順変更

- 入力: body `{ title?: string, description?: string, order?: number }`。
- 存在確認: Card なしは 404。
- 検証: `title` 指定時 1〜200文字（違反 422）。`description` 指定時 0〜2000文字（違反 422）。`order` 指定時は整数。
- 処理: 指定フィールドを更新。
- 出力: 更新後 Card。
- ステータス: 200。
- 権限: member 以上。失敗時 401/403/404。
- ログ: requestId・cardId を操作ログに記録。

### DELETE /api/cards/[cardId] — カード削除

- 存在確認: Card なしは 404。
- 処理: Card 削除。
- 出力: `{ ok: true }`。
- ステータス: 200。
- 権限: member 以上。失敗時 401/403/404。
- ログ: requestId・cardId を操作ログに記録。

## UI構造

- `/boards/[id]`（ボード詳細画面）内、各リスト列のカード領域。
  - 領域: リスト列内にカード一覧領域（order 昇順）＋ カード作成フォーム領域。
  - カードが 0 件のリストは空状態を表示。
  - カードクリックでカード詳細モーダルを開く。
- カード詳細モーダル（基本構造, クライアント）
  - 領域: `title` 編集領域 ＋ `description` 編集領域 ＋ 閉じる操作。
  - 状態の所在: 開閉状態と編集中の値はモーダルコンポーネントが保持。保存後に一覧を再取得／再描画で反映。

## 状態遷移

- Card のライフサイクル: 作成 →（タイトル編集 / 説明編集 / 並び順変更）→ 削除。
- モーダル UI 状態: 閉 → 開（カードクリック）→ 閉（閉じる操作 / 保存後）。

## 非機能の実装方針

### 性能

- 一覧は `where listId` + `orderBy order` の単一クエリ。`@@index([listId])` で引く。P95 200ms 以内。
- 書き込みは単一トランザクション。P95 300ms 以内。

### セキュリティ

- 入力長（title 200 / description 2000）を検証層でチェック。ローカル SQLite・機密データなし。

### 運用

- requestId を操作ログ・エラーログに付与（lib 共通処理）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET /api/lists/[listId]/cards | 認証 → 対象存在 → viewer 以上 | 401 / 404 / (権限なし)404 |
| POST /api/lists/[listId]/cards | 認証 → 対象存在 → member → 検証 | 401 / 404 / 403 / 422 |
| PATCH /api/cards/[cardId] | 認証 → 対象存在 → member → 検証 | 401 / 404 / 403 / 422 |
| DELETE /api/cards/[cardId] | 認証 → 対象存在 → member | 401 / 404 / 403 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| カード作成 | info | requestId, 操作種別, listId, cardId |
| カード編集・並び替え | info | requestId, 操作種別, cardId |
| カード削除 | info | requestId, 操作種別, cardId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- `description` は Prisma `@default("")` を採用し、省略時は空文字を保存（仕様「省略時は空文字」に一致）。
- 並び順変更は PATCH の `order` で対象 Card の値を更新する方式に固定（リスト間移動・一括再採番は本コアでは扱わない。理由: 仕様は同一リスト内の order 更新のみ要求。カード移動は後続機能）。
- 共通部品（Prisma client・エラー整形・requestId・検証・権限境界）は design/001・002 と共有。

## テスト方針

- Vitest 4 で API テスト（正常系・異常系・境界条件）。
- ケース: 一覧（0件/複数・order昇順・list404）、作成（正常・description省略で空文字・空title422・201文字title422・2001文字desc422・order採番）、編集（title正常・description正常・order正常・404）、削除（正常・404）。

## 実装順序

1. 共通部品・Prisma スキーマ（Card モデルを含める、design/001 で作成）。
2. Card API（Route Handler）。理由: List API・共通部品に依存。
3. ボード詳細画面のカード描画 ＋ カード詳細モーダル。理由: API 完成後に接続。
4. テスト。理由: 実装確定後に検証。

## 未決事項

- 認証・実ロール解決は後続機能で決定。
- カードのリスト間移動・アーカイブ・担当者・期限・ラベル・コメントは後続機能（本コア対象外）。
