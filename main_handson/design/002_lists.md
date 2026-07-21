# リスト（List）の設計

## 関連仕様

- spec/000_shared_rules.md
- spec/002_lists.md
- spec/001_boards.md
- constitution.md

## 前提

- design/001_boards.md の前提（技術スタック・認証未接続・共通規則）を継承する。
- Board モデルは design/001_boards.md で定義済み。List は Board に属し、Card を内包する。
- 認証・権限の実ロール解決は後続機能で接続（コア段階は通過）。

## データモデル

```prisma
model List {
  id        String   @id @default(cuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  title     String
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  cards     Card[]

  @@index([boardId])
}
```

- `order`: 同一 `boardId` 内の昇順。作成時は同一ボード内既存最大 + 1（0 件なら 0）。
- Board 削除時に cascade 削除（`onDelete: Cascade`）。
- List 削除時は配下 Card を cascade 削除（Card モデル側で設定）。

## API設計

### GET /api/boards/[boardId]/lists — リスト一覧取得

- 入力: パス `boardId`。
- 存在確認: Board なしは 404 / NOT_FOUND。
- 処理: 該当 Board の List を `order` 昇順で取得。
- 出力: `{ items: List[] }`。
- ステータス: 200。
- 権限: viewer 以上。
- ログ: requestId を操作ログに記録。

### POST /api/boards/[boardId]/lists — リスト作成

- 入力: パス `boardId`、body `{ title: string }`。
- 存在確認: Board なしは 404。
- 検証: `title` 1〜100文字。違反は 422 / VALIDATION_ERROR。
- 処理: `order` = 同一ボード内既存最大 + 1 を採番して作成。
- 出力: 作成した List。
- ステータス: 201。
- 権限: member 以上。失敗時 401/403。
- ログ: requestId・listId を操作ログに記録。

### PATCH /api/lists/[listId] — リスト名編集・並び順変更

- 入力: body `{ title?: string, order?: number }`。
- 存在確認: List なしは 404。
- 検証: `title` 指定時 1〜100文字（違反 422）。`order` 指定時は整数。
- 処理: 指定フィールドを更新。
- 出力: 更新後 List。
- ステータス: 200。
- 権限: member 以上。失敗時 401/403/404。
- ログ: requestId・listId を操作ログに記録。

### DELETE /api/lists/[listId] — リスト削除

- 存在確認: List なしは 404。
- 処理: List 削除（cascade で配下 Card も削除）。
- 出力: `{ ok: true }`。
- ステータス: 200。
- 権限: member 以上。失敗時 401/403/404。
- ログ: requestId・listId を操作ログに記録。

## UI構造

- `/boards/[id]`（ボード詳細画面, Server Component でボード＋リスト＋カードを取得）
  - 領域: ボードヘッダー領域 ＋ リスト列領域（横並び）＋ リスト作成フォーム領域。
  - 各リスト列はリスト名・カード領域・カード作成フォームを含む（カードは design/003）。
  - リストが 0 件のとき空状態領域を表示。
  - 状態の所在: サーバー取得したボード配下データを画面が保持。作成・編集・削除・並び替え後は再取得で反映。

## 状態遷移

- List のライフサイクル: 作成 →（名称編集 / 並び順変更）→ 削除。中間状態なし。

## 非機能の実装方針

### 性能

- 一覧は `where boardId` + `orderBy order` の単一クエリ。`@@index([boardId])` で引く。P95 200ms 以内。
- 書き込みは単一トランザクション。P95 300ms 以内。

### セキュリティ

- 入力長を検証層でチェック。ローカル SQLite・機密データなし。

### 運用

- requestId を操作ログ・エラーログに付与（lib 共通処理）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET /api/boards/[boardId]/lists | 認証 → 対象存在 → viewer 以上 | 401 / 404 / (権限なし)404 |
| POST /api/boards/[boardId]/lists | 認証 → 対象存在 → member → 検証 | 401 / 404 / 403 / 422 |
| PATCH /api/lists/[listId] | 認証 → 対象存在 → member → 検証 | 401 / 404 / 403 / 422 |
| DELETE /api/lists/[listId] | 認証 → 対象存在 → member | 401 / 404 / 403 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| リスト作成 | info | requestId, 操作種別, boardId, listId |
| リスト編集・並び替え | info | requestId, 操作種別, listId |
| リスト削除 | info | requestId, 操作種別, listId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- 並び順変更は PATCH の `order` フィールドで対象 List の値を更新する方式に固定（一括再採番 API は本コアでは作らない。理由: 仕様は単一リストの order 更新のみ要求）。
- title と order は同一 PATCH で任意指定可能（両方省略は変更なしとして 200、または検証なし）。
- 共通部品（Prisma client・エラー整形・requestId・検証・権限境界）は design/001 と共有。

## テスト方針

- Vitest 4 で API テスト（正常系・異常系・境界条件）。
- ケース: 一覧（0件/複数・order昇順・存在しないboard404）、作成（正常・空文字422・101文字422・order採番・board404）、編集（title正常・order正常・404）、削除（正常・cascade・404）。

## 実装順序

1. 共通部品・Prisma スキーマ（design/001 で作成済みを利用、List モデルを含める）。
2. List API（Route Handler）。理由: Board API・共通部品に依存。
3. ボード詳細画面（`/boards/[id]`）のリスト列描画。理由: API 完成後に接続。
4. テスト。理由: 実装確定後に検証。

## 未決事項

- 認証・実ロール解決は後続機能で決定。
