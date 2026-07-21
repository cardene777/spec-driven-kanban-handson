# ボード（Board）の設計

## 関連仕様

- spec/000_shared_rules.md
- spec/001_boards.md
- constitution.md

## 前提

- 技術スタックは constitution.md に従う（Next.js 16 App Router / Prisma 7 adapter 方式 / SQLite / TypeScript / Tailwind / Vitest 4）。
- Prisma client の output は `../generated/prisma`、adapter は `@prisma/adapter-better-sqlite3`。
- **認証・メンバーシップ（User / Membership / role）モデルは本コア設計の対象外**（後続機能 auth/invite/permissions で追加）。本設計では権限チェックの「配置」と失敗時応答を定義し、実際のロール解決はその後続機能で接続する。コア実装段階では認証・権限は常に通過する前提で API を組み、チェック点をコメント／関数境界として残す。
- 共通のエラー応答・一覧レスポンス形状・order/ID/日付/ログ規則は spec/000_shared_rules.md に従う。

## データモデル

Prisma スキーマ（Board 部分）。List/Card は各設計で定義するが、cascade 関係のためここに全体像を示す。

```prisma
model Board {
  id        String   @id @default(cuid())
  title     String
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lists     List[]
}
```

- `id`: cuid 文字列（サーバー採番、ID 規則準拠）。
- `order`: 全体スコープの昇順。作成時は既存最大 + 1（0 件なら 0）。
- Board 削除時は配下 List → Card を cascade 削除（List モデル側で `onDelete: Cascade` を設定）。

## API設計

### GET /api/boards — ボード一覧取得

- 入力: なし。
- 処理: 全 Board を `order` 昇順で取得。
- 出力: `{ items: Board[] }`。
- ステータス: 200。
- 権限: viewer 以上（コア段階では常時通過）。
- ログ: リクエスト ID を発行し操作ログに記録。

### POST /api/boards — ボード作成

- 入力: `{ title: string }`。
- 検証: `title` 1〜100文字。違反は 422 / VALIDATION_ERROR。
- 処理: `order` = 既存最大 + 1 を採番して作成。
- 出力: 作成した Board。
- ステータス: 201。
- 権限: owner。未認証 401 / 権限不足 403（コア段階では通過）。
- ログ: 操作ログにリクエスト ID・作成 ID を記録。

### PATCH /api/boards/[boardId] — ボード名編集

- 入力: `{ title: string }`。
- 存在確認: 対象なしは 404 / NOT_FOUND。
- 検証: `title` 1〜100文字。違反は 422。
- 出力: 更新後 Board。
- ステータス: 200。
- 権限: owner。失敗時 401/403/404。
- ログ: 操作ログにリクエスト ID・対象 ID を記録。

### DELETE /api/boards/[boardId] — ボード削除

- 存在確認: 対象なしは 404 / NOT_FOUND。
- 処理: Board を削除（cascade で配下 List/Card も削除）。
- 出力: なし。
- ステータス: 200（空ボディ）または 204。→ 本設計では **200 + `{ ok: true }`** に固定。
- 権限: owner。失敗時 401/403/404。
- ログ: 操作ログにリクエスト ID・対象 ID を記録。

## UI構造

- `/`（ボード一覧画面, Server Component でデータ取得）
  - 領域: ボード作成フォーム領域 ＋ ボード一覧領域 ＋ 空状態領域。
  - ボード作成フォームはクライアント操作（作成後に一覧を再取得／再描画）。
  - 一覧の各ボードは `/boards/[id]` へのリンク。
  - 状態の所在: サーバー取得したボード配列を画面が保持。作成・編集・削除後は再取得で反映。

## 状態遷移

- Board のライフサイクル: 作成 → （名称編集）→ 削除。中間状態なし（アーカイブは後続機能）。

## 非機能の実装方針

### 性能

- 一覧は単一クエリ（`order` 昇順 orderBy）で取得。P95 200ms 以内（少量データ前提）。
- 書き込みは単一トランザクション。P95 300ms 以内。

### セキュリティ

- ローカル SQLite・機密データなし。入力は検証層で長さチェック。

### 運用

- リクエスト ID を各リクエスト冒頭で発行し、操作ログ・エラーログ両方に付与（lib 共通処理）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET /api/boards | 認証 → viewer 以上 | 401 / (権限なし)404 |
| POST /api/boards | 認証 → owner | 401 / 403 |
| PATCH /api/boards/[boardId] | 認証 → 対象存在 → owner → 入力検証 | 401 / 404 / 403 / 422 |
| DELETE /api/boards/[boardId] | 認証 → 対象存在 → owner | 401 / 404 / 403 |

（コア段階ではロール解決が未接続のため通過。チェック順序「認証→存在→権限→検証」を関数構造として固定する。）

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| ボード作成 | info | requestId, 操作種別, boardId |
| ボード編集 | info | requestId, 操作種別, boardId |
| ボード削除 | info | requestId, 操作種別, boardId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- ID は Prisma `@default(cuid())` を採用（サーバー採番・衝突しない一意値の要件を満たす）。UUID も候補だが cuid で統一（理由: 単一方式に固定）。
- 削除応答は 200 + `{ ok: true }` に固定（204 も可だがテスト検証を容易にするため本文ありに統一）。
- 入力検証・エラー整形・リクエスト ID 発行・権限チェック境界は `lib/` の共通関数に集約（各 Route Handler から再利用）。

## テスト方針

- Vitest 4 で API レベルのテスト（正常系・異常系・境界条件）。
- ケース: 一覧取得（0件/複数・order昇順）、作成（正常・空文字422・101文字422・order採番）、編集（正常・404）、削除（正常・cascade・404）。
- テストは SQLite を用い、各テストで DB をクリーンにするヘルパを用意。

## 実装順序

1. 共通部品（`lib/`）
   Prisma client（adapter 方式）、エラー応答整形、リクエスト ID／ログ、入力検証、権限チェック境界。理由: 全 API が依存。
2. Prisma スキーマ + migration
   Board/List/Card モデルと cascade。理由: API・テストが依存。
3. Board API（Route Handler）
   一覧・作成・編集・削除。理由: 共通部品とスキーマに依存。
4. 一覧画面（`/`）
   API を接続。理由: API 完成後に描画・操作を接続。
5. テスト
   受入条件に対応する API テスト。理由: 実装確定後に検証。

## 未決事項

- 認証・メンバーシップ・実ロール解決（User/Membership/role）は後続機能 auth/invite/permissions で決定する。本設計では配置のみ定義。
