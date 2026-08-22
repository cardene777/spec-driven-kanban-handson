# 担当者（Assignee）の設計

## 関連仕様

- spec/009_assignee.md / spec/003_cards.md / spec/005_card_detail.md
- spec/000_shared_rules.md / constitution.md

## 前提

- design/001-008 の前提（技術スタック・共通規則・認証未接続）を継承する。
- **CardAssignee を新規追加する（未実装のため要 migration。統合実装時に作成）**。担当者は User を指す。
- User / BoardMembership は後続の認証・招待・権限機能で確定するモデル。本設計の統合部分（存在確認・メンバー判定・権限）はそれに依存する。
- **本章の TDD は外部依存を持たない純粋関数（FR-004 / FR-005）のみを対象**とし、DB・認証・API・UI は統合実装（後続）に回す。純粋関数の PASS だけでは機能実装済みとしない。

## データモデル

統合実装時に追加する（本章の純粋関数テストでは使用しない）。

```prisma
model CardAssignee {
  id        String   @id @default(cuid())
  cardId    String
  userId    String
  createdAt DateTime @default(now())

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  // user User @relation(...) は User モデル確定後に接続

  @@unique([cardId, userId])
  @@index([cardId])
  @@index([userId])
}
```

- Card 側に `cardAssignees CardAssignee[]`（`onDelete: Cascade`）を追加する。
- 1カードあたり最大10件。`canAddAssignee`は単体テストする事前判定に使い、統合時は担当者数の取得と追加を直列化して上限を保証する。

## API設計

統合実装時に追加する。入口チェック順序は「認証 → 対象存在 → 権限 → 入力検証」。

### GET /api/cards/[cardId]/assignees

- Card 存在確認（404）。担当者を取得し `{ items }` / 200。viewer 以上。

### POST /api/cards/[cardId]/assignees

- 入力 `{ userId }`。Card 存在（404）。member 以上（403）。
- 検証順:
  1. `userId` が空でない文字列か（`isValidAssigneeUserId`）→ 不正は 422。
  2. User 存在（404）。
  3. userId が対象ボードのメンバーか → 非メンバーは 422。
  4. 既に担当者か（重複）→ 409。
  5. 現在の担当者数 < 10 か（`canAddAssignee`）→ 上限超過は 422。
- 担当者数の取得と追加は、Prismaのinteractive transactionを`Serializable`で実行する。書き込み競合（P2034）は3回まで再試行し、再取得後に10人へ達していれば422を返す。
- 追加 / 201。ログ `assignee.add`。

### DELETE /api/cards/[cardId]/assignees/[userId]

- Card 存在（404）。member 以上（403）。担当者（CardAssignee）を削除。未割当でも冪等 200。`{ ok: true }`。ログ `assignee.remove`。

## 純粋関数の契約（本章 TDD 対象・シグネチャ固定）

TDD（③）と実装（④）が一致するよう、関数名・配置・振る舞いを固定する。

### `lib/schemas/assignees.ts`（FR-004: 担当者入力のバリデーション）

```ts
// userId が「空でない文字列」であることを検証する純粋関数
export function isValidAssigneeUserId(userId: unknown): boolean;
```

- 妥当（true）: `typeof userId === "string"` かつ `userId.trim().length > 0`。
- 不正（false）: 空文字 `""`、空白のみ、非文字列（number / null / undefined / object 等）。

### `lib/assignees/limit.ts`（FR-005: 担当者数の上限判定）

```ts
export const MAX_ASSIGNEES = 10;

// 現在の担当者数から、追加を許可できるかを判定する純粋関数
export function canAddAssignee(currentCount: number): boolean;
```

- 許可（true）: `currentCount` が 0 以上の整数かつ `currentCount < MAX_ASSIGNEES`（例: 0→true、9→true）。
- 拒否（false）: `currentCount >= MAX_ASSIGNEES`（例: 10→false、11→false）。負数・非整数は拒否（false）とする。

## UI構造

- カード詳細モーダル（`spec/005_card_detail.md`）に担当者領域を追加する。
  - 割り当て済み担当者をアバター/名前で表示。0 人は「担当者なし」。
  - member 以上は追加（ボードメンバーから選択）・削除。上限10到達時は追加操作を抑止。
- 状態の所在: 担当者選択パネルの開閉・選択はモーダル側。確定後に再取得（router.refresh）。
- 部品階層は `/ui-design` に委ねる（担当者 UI 実装は後続工程）。

## 状態遷移

- CardAssignee: 未割当 ⇄ 割当（追加/削除）。同一 (cardId,userId) は1件のみ。UI 状態遷移は後続工程。

## 非機能の実装方針

### 性能

- 純粋関数はO(1)。統合の一覧は `where cardId` の単一クエリ（`@@index([cardId])`）。一覧の応答時間は200ms以内、追加と削除の応答時間は300ms以内。

### セキュリティ

- 統合時、担当者化は「対象ボードのメンバー」に限定し越境割当を防ぐ。純粋関数は入力検証のみで副作用なし。

### 運用

- 統合時、追加・削除を requestId 付きで操作ログに記録。純粋関数はログ対象外（副作用なし）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET assignees | 認証 → Card存在 → viewer以上 | 401 / 404 / (権限なし)404 |
| POST assignees | 認証 → Card存在 → member → userId検証 → User存在 → メンバー判定 → 重複 → 上限 | 401 / 404 / 403 / 422 / 404 / 422 / 409 / 422 |
| DELETE assignees | 認証 → Card存在 → member | 401 / 404 / 403 |

（純粋関数 `isValidAssigneeUserId` / `canAddAssignee` は上記フローの「userId検証」「上限」に対応。認証・ロール・存在・メンバー判定の実挙動は後続 auth 機能で接続。）

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| 担当者追加 | info | requestId, assignee.add, cardId, userId |
| 担当者削除 | info | requestId, assignee.remove, cardId, userId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- 上限は `MAX_ASSIGNEES = 10` を `lib/assignees/limit.ts` に定数化し、API 層とUI の抑止で共有（数値のハードコードを散らさない）。API層では、Serializable transaction内で担当者数を取得して追加し、同時リクエストでも上限を超えないようにする。
- 入力検証と上限判定は副作用のない純粋関数に切り出し、単体テスト可能にする（TDD 対象）。統合の 409/422/401/403・存在確認・メンバー判定は Route Handler + 実 DB + 認証で実装する（本章対象外）。
- `isValidAssigneeUserId` は trim 後の長さで判定（空白のみを不正扱い）。既存 `lib/validation/text.ts` の trim 方針と整合させる。

## テスト方針

- 本章は純粋関数の単体テストのみ（Vitest、DB・モック不要）。
  - `tests/schemas/assignees.test.ts`: `isValidAssigneeUserId` の妥当/不正（空文字・空白・非文字列・正常文字列）。FR-004。
  - `tests/assignees/limit.test.ts`: `canAddAssignee` の 0→true、9→true、10→false、11→false。FR-005。
- 統合テスト（後続）の前提: 実 DB（Prisma）＋ 認証モック（currentUser）＋ ボードメンバー判定。既存 `tests/api/kanban.test.ts` の in-memory prisma mock を拡張して 409/422/401/403・存在確認・一覧を検証する。
- 9人が割り当て済みのカードへ異なる2人を同時に追加し、片方だけが201、もう片方が422となり、保存件数が10件であることを実DBで確認する。

## Red-Green-Refactor で扱う FR の順番

1. **FR-004（`isValidAssigneeUserId`）** — Red: `tests/schemas/assignees.test.ts` を先に書き FAIL（未実装）。Green: `lib/schemas/assignees.ts` を最小実装。Refactor: 命名・trim 方針を整理。
2. **FR-005（`canAddAssignee` / `MAX_ASSIGNEES`）** — Red: `tests/assignees/limit.test.ts` を先に書き FAIL。Green: `lib/assignees/limit.ts` を最小実装。Refactor: 定数化・境界の明確化。
3. （後続）FR-001/002/003 の統合実装 — 実 DB・認証・API・UI。本章対象外。

## 実装順序

1. （③ /tdd）純粋関数の失敗テストを 2 ファイルに作成（Red）。
2. （④ /implement）`lib/schemas/assignees.ts` と `lib/assignees/limit.ts` を最小実装で Green → Refactor。
3. （後続）CardAssignee モデル + migration、Route Handler、認証・メンバー判定、カード詳細 UI（担当者領域）を統合実装。

## 未決事項

- User / BoardMembership モデル確定（認証・招待・権限機能）。統合部分（存在確認・メンバー判定・権限・DB）はそこに依存。
- 担当者 UI（カード詳細の担当者領域）の実装は後続工程。
