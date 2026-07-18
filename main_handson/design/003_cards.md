# カード機能の設計

## 関連仕様

- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`

## 前提

- List と Board のデータモデル・権限判定・監査ログ方針は `design/001_boards.md` と `design/002_lists.md` を継承。
- Card 詳細モーダルは「基本構造」のみ本設計で扱い、ラベル / 期限 / 担当者 / コメントは本章 03 以降のセクションで拡張する。

## データモデル

Prisma スキーマ（抜粋）:

```prisma
model Card {
  id          String   @id @default(cuid())
  listId      String
  title       String
  description String   @default("")
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  list List @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, order])
}
```

- `description` は `""` をデフォルトにする（`null` を使わない：0 文字と「未指定」を分けない）。
- `@@unique([listId, order])` で同一リスト内の並び順を一意に保つ。
- List 削除で Card も `onDelete: Cascade` により消える。

## API 設計

| メソッド | パス | 入力 | 出力（成功） | ステータス | 権限 | ログ |
|---|---|---|---|---|---|---|
| GET | `/api/lists/{listId}/cards` | パス `listId` | `{ "items": Card[] }` | 200 | 所属ボードの `viewer` 以上 | `card.list.view` |
| GET | `/api/cards/{cardId}` | パス `cardId` | `Card` | 200 | 所属ボードの `viewer` 以上 | `card.view` |
| POST | `/api/lists/{listId}/cards` | `{ "title": string }` | `Card` | 201 | 所属ボードの `member` 以上 | `card.create` |
| PATCH | `/api/cards/{cardId}` | `{ "title"?: string, "description"?: string }` | `Card` | 200 | 所属ボードの `member` 以上 | `card.update` |
| DELETE | `/api/cards/{cardId}` | パス `cardId` | なし | 204 | 所属ボードの `member` 以上 | `card.delete` |

- `PATCH` は `title` と `description` の片方または両方を許可、両方省略は `422 { "_root": "no_fields" }`。
- 作成時 `description` は空文字を保存。

## UI 構造

- ボード詳細（`/boards/[boardId]`）内で、リスト列の中にカードを縦並びに表示する。
- 各カードは `title` を表示し、クリックでカード詳細モーダルを開く。
- モーダルの中に `title`（入力欄）、`description`（複数行入力欄）、`createdAt` / `updatedAt`（読み取り専用）を配置。
- 部品分割・階層・トークン参照は `/ui-design` と `/design-system` に委ねる。

## 状態遷移

- カード追加: 「+ カード追加」→ タイトル入力 → 保存 → リスト末尾に追加。
- カード編集: モーダルを開き、`title` / `description` を編集 → blur または 保存ボタンで PATCH。
- カード削除: モーダル内「削除」→ 確認 → DELETE → モーダル閉じる。

## 非機能の実装方針

### 性能

- 一覧 API は `WHERE listId=? ORDER BY order ASC` を索引で高速化。P95 200ms 以内。

### セキュリティ

- `PATCH` / `DELETE` は Card から listId → boardId を辿って `requireBoardRole(boardId, "member")` を実行する。

### 運用

- 監査ログは `card.create` / `card.update` / `card.delete` の 3 種類。
- `PATCH` では変更フィールドをログに残す（`title` のみ / `description` のみ / 両方）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| Route Handler 冒頭 | `currentUser()` が null | 401 UNAUTHORIZED |
| 対象存在確認 | 対象 List（一覧・作成）/ 対象 Card（詳細・更新・削除） | 404 NOT_FOUND |
| Membership 確認 | `viewer` 以上（GET）/ `member` 以上（POST/PATCH/DELETE） | 一覧 404、書き込み 403 |
| POST/PATCH 前 | `validateTitle(body.title, 200)` / `validateDescription(body.description, 2000)` / PATCH 両方省略チェック | 422 VALIDATION_ERROR |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `card.create` | info | `actor`, `boardId`, `listId`, `cardId`, `title` |
| `card.update` | info | `actor`, `boardId`, `listId`, `cardId`, `fields`(変更フィールド名の配列) |
| `card.delete` | info | `actor`, `boardId`, `listId`, `cardId` |

## 実装方針

- Card Route Handler は listId → boardId 変換のためにリポジトリ層 `lib/repository/card.ts` に `findById()` を用意する。
- `validateDescription(raw, max)` を `lib/validation/text.ts` に追加し、`title` と共通ロジックを共有する。
- モーダル UI は `app/boards/[boardId]/_components/CardDetailModal.tsx` に切り出す。
- モーダル内の保存はデバウンスや複雑な状態管理を避け、`onBlur` または「保存」ボタンで PATCH。

## テスト方針

- `tests/api/cards.test.ts` で FR-001〜FR-012 をカバー。
- カード作成／更新／削除、`title` と `description` の境界（1/200/201、0/2000/2001）、PATCH の両フィールド省略、404 / 403 / 422 の区別、末尾追加の連番。

## 実装順序

1. `prisma/schema.prisma` に `Card` を追加、`npx prisma migrate dev --name add_card` を実行。
2. `lib/repository/card.ts` を実装。
3. `app/api/lists/[listId]/cards/route.ts`（GET/POST）と `app/api/cards/[cardId]/route.ts`（GET/PATCH/DELETE）を実装。
4. `app/boards/[boardId]/_components/CardItem.tsx` と `CardCreateForm.tsx`、`CardDetailModal.tsx` を実装。
5. `tests/api/cards.test.ts` を書き、`npm run lint / typecheck / test / build` を全通しにする。
