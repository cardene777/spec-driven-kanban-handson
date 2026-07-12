# 担当者割り当ての設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/002_lists.md`
- `spec/003_cards.md`
- `spec/005_card_detail.md`
- `spec/009_assignee.md`

## 前提

Prisma 全体スキーマ、認証・認可の共通ユーティリティ (`requireCurrentUser` / `assertBoardAccess` / `getBoardRole`)、エラーレスポンスヘルパ、監査ログ形式、`withApiHandler` は `design/001_boards.md § 共通設計方針` を参照する。
Card エンティティの基本と `resolveBoardFromCard(cardId)` は `design/003_cards.md § データモデル` を参照する。
本 file は `spec/009_assignee.md` を満たす担当者機能 (1 カードに最大 10 名) の設計に閉じる。

## 既存設計との差分

- `design/005_card_detail.md § データモデル` は `Card.assigneeId: String?` の単一担当者モデルを想定していた。本 file はこれを `CardAssignee` 中間テーブルへの複数担当者モデルに置き換える。既存 `prisma/schema.prisma` には `assigneeId` は未実装のため、新規 migration で `CardAssignee` を追加する形で移行できる。
- 単一担当者用 API (`PATCH /api/cards/{cardId}/assignee`) は本設計の 3 endpoint (`GET` / `POST` / `DELETE /api/cards/{cardId}/assignees[/{userId}]`) に置き換える。
- `spec/000_shared_rules.md § HTTP ステータスコード` の 4 種 (401/403/404/422) に加え、重複登録時にのみ `409 Conflict` を返す。`lib/http/errors.ts` にヘルパを追加する。
- 監査ログの `TargetType` に `card` を継続使用する (`CardAssignee` は単独リソースとしては公開せず、Card への子アクションとして扱う)。

## データモデル

### CardAssignee モデル (新設)

```prisma
model CardAssignee {
  cardId    String
  userId    String
  createdAt DateTime @default(now())

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user User @relation("CardAssignees", fields: [userId], references: [id], onDelete: Cascade)

  @@id([cardId, userId])
  @@index([cardId])
  @@index([userId])
}
```

- 複合主キー `(cardId, userId)` により同一カードへの同一ユーザーの重複登録を DB レベルで拒否する。アプリ層では `PrismaClientKnownRequestError` の `P2002` を捕捉し `409` に変換する。
- `onDelete: Cascade` により Card / User の物理削除で CardAssignee も削除される (`spec/009_assignee.md § 未決事項` の「割当済み担当者がボードから外れた場合の自動クリーンアップは対象外」 は、User 物理削除ではなく BoardMembership 消滅ケースを指す)。

### User モデルへの relation 追加

```prisma
model User {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  memberships    BoardMembership[]
  assignedCards  CardAssignee[]    @relation("CardAssignees")
}
```

### Card モデルへの relation 追加

```prisma
model Card {
  id          String         @id @default(cuid())
  listId      String
  title       String
  description String         @default("")
  order       Int
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  list        List           @relation(fields: [listId], references: [id], onDelete: Cascade)
  assignees   CardAssignee[]

  @@unique([listId, order])
  @@index([listId])
}
```

- `Card` に直接の `assigneeId` 列は持たせない。担当者情報は `CardAssignee` の関連経由で取得する。

### JSON 表現

`CardAssignee` の API レスポンス。

```json
{
  "cardId": "clx...card",
  "userId": "usr_abc",
  "createdAt": "2026-07-12T09:00:00.000Z"
}
```

- 一覧 API のレスポンスは `{ "items": CardAssignee[] }`。
- `POST` の 201 body は作成された `CardAssignee` オブジェクトを返す。
- `DELETE` は body なしで `204` を返す。

## API 設計

`spec/009_assignee.md § API` の 3 endpoint を Route Handler で実装する。file 配置。

- `app/api/cards/[cardId]/assignees/route.ts` … `GET` / `POST`
- `app/api/cards/[cardId]/assignees/[userId]/route.ts` … `DELETE`

### `GET /api/cards/{cardId}/assignees` 一覧取得

- 入力 = パスパラメータ `cardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、未存在なら `404`。
  2. `assertBoardAccess(userId, card.boardId, "viewer")`。
  3. `prisma.cardAssignee.findMany({ where: { cardId }, orderBy: [{ createdAt: "asc" }, { userId: "asc" }] })`。
- 出力 = `200 { items: CardAssignee[] }`。0 件は `{ items: [] }`。
- ステータス = `200` / `401` / `404`。
- ログ = `event=card.assignee.list`、`targetType=card`、`targetId=cardId`、`context={ boardId, count }`。

### `POST /api/cards/{cardId}/assignees` 追加

- 入力 = パスパラメータ `cardId`、body = `{ userId: string }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション (zod、`lib/schemas/assignees.ts`)。
  - `userId` 未指定または空文字は `422 { userId: "required" }`。
  - `userId` が文字列でないなら `422 { userId: "invalid_type" }`。
- 処理 (1 トランザクション、`prisma.$transaction`)。
  1. `card = resolveBoardFromCard(cardId)`、未存在なら `404`。
  2. `assertBoardAccess(actorId, card.boardId, "member")`。
  3. body を zod 検証。
  4. `user = tx.user.findUnique({ where: { id: userId } })`、未存在なら `422 { userId: "assignee_not_found" }`。
  5. `role = tx.boardMembership.findUnique({ where: { boardId_userId: { boardId, userId } }, select: { role: true } })`、`null` なら `422 { userId: "assignee_not_in_board" }` (`viewer` / `member` / `owner` はいずれも受理)。
  6. `count = tx.cardAssignee.count({ where: { cardId } })`、`count >= 10` なら `422 { userId: "assignees_limit_exceeded" }`。
  7. `tx.cardAssignee.create({ data: { cardId, userId } })` を実行。Prisma 制約違反 (`P2002`) を捕捉した場合は `409 { userId: "already_assigned" }` (`ConflictError`) に変換する。
  8. `tx.card.update({ where: { id: cardId }, data: {} })` で Card の `updatedAt` を明示更新する (Prisma の `@updatedAt` は `update` 呼出時に更新されるため、空データ更新で強制する)。
- 出力 = `201 CardAssignee`。
- ステータス = `201` / `401` / `403` / `404` / `409` / `422`。
- ログ = `event=card.assignee.add`、`targetType=card`、`targetId=cardId`、`context={ boardId, userId }`。

### `DELETE /api/cards/{cardId}/assignees/{userId}` 削除

- 入力 = パスパラメータ `cardId`、`userId`。body なし。
- 権限 = 対象ボードの `member` 以上。
- 処理 (1 トランザクション)。
  1. `card = resolveBoardFromCard(cardId)`、未存在なら `404`。
  2. `assertBoardAccess(actorId, card.boardId, "member")`。
  3. `assignment = tx.cardAssignee.findUnique({ where: { cardId_userId: { cardId, userId } } })`、`null` なら `404`。
  4. `tx.cardAssignee.delete({ where: { cardId_userId: { cardId, userId } } })`。
  5. `tx.card.update({ where: { id: cardId }, data: {} })` で Card の `updatedAt` を更新。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404`。
- ログ = `event=card.assignee.remove`、`targetType=card`、`targetId=cardId`、`context={ boardId, userId }`。

### 追加のエラーヘルパ

`lib/http/errors.ts` に以下を追加する。

```ts
export class ConflictError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("conflict");
    this.name = "ConflictError";
    this.fields = fields;
  }
}

export function conflictError(fields: Record<string, string>) {
  return NextResponse.json(
    { error: "conflict", fields },
    { status: 409 },
  );
}
```

`lib/http/withApiHandler.ts` に `ConflictError` 判定を追加する (`status=409`、`errorCode="conflict"`)。`AuditEvent.errorCode` の union に `"conflict"` を追加する。

## UI 構造

### 配置

- `design/005_card_detail.md § UI 構造` の `CardDetailModal` 内、担当者領域 (`CardAssigneesField` に改名) を本設計で扱う。他 5 領域は本 spec の対象外。
- 担当者領域は独立した Client Component として実装し、領域ごとに fetch / mutation state を持つ。

### 主要 Client Component (本 spec 対象分)

| コンポーネント | 責務 |
|---|---|
| `CardAssigneesField` | 担当者領域全体。 一覧の描画 (バッジ列)、追加導線、解除導線。 |
| `CardAssigneeAddForm` | 担当者候補からユーザーを選択して `POST /api/cards/{cardId}/assignees` を叩く。 |
| `CardAssigneeBadge` | 割当済みユーザー 1 名分のバッジ。`member` 以上には解除ボタンを表示。 |

### 領域内の状態

- `CardAssigneesField` = `idle → loading → success (items=[] なら empty placeholder) | error`。
- `CardAssigneeAddForm` = `idle → submitting → success (一覧再取得) | error(inline: 422 / 409)`。
- `CardAssigneeBadge` の解除 = `idle → submitting → success (一覧再取得) | error`。
- 4xx / 5xx はいずれも領域内に inline error を出し、モーダル他領域は影響を受けない (`spec/005_card_detail.md § 領域独立性` を継承)。

### 担当者候補

- 候補は「対象ボードの `viewer` 以上のメンバー全員」 (`spec/009_assignee.md § バリデーション`)。
- 候補一覧 API は本 spec 対象外 (`spec/009_assignee.md § 未決事項`)。初期実装はボード詳細画面のサーバーコンポーネントで `BoardMembership` から取得したメンバー一覧を Context 経由で `CardAssigneesField` に渡す (`design/005_card_detail.md § 担当者候補の取得` の経路を継承)。

### 空状態と権限別表示

- 担当者 0 人時は「未割当」 相当のプレースホルダ表示 (文言は `ui-design/`)。
- 追加導線と解除導線は `member` 以上にのみ表示 (`spec/009_assignee.md § FR-04`)。
- `viewer` に対しては一覧のみ表示、追加 / 解除の操作導線を DOM 上に出さない。

## 状態遷移

### エンティティ状態

CardAssignee (1 割当関係あたり)。

```
[存在せず]         --POST-->                                    [存在]
[存在]             --DELETE-->                                  [存在せず]
[Card 削除]        --Cascade-->                                 [存在せず]
[User 削除]        --Cascade-->                                 [存在せず]
```

Card (担当者一覧の観点)。

```
[担当者 0 名]     --POST 1 名目-->                              [担当者 1 名]
[担当者 n 名]     --POST (n < 10)-->                            [担当者 n+1 名]
[担当者 10 名]    --POST 11 名目-->                             [担当者 10 名 (422 assignees_limit_exceeded)]
[担当者 n 名 (X 含む)] --POST X (再登録)-->                     [担当者 n 名 (409 already_assigned)]
[担当者 n 名 (X 含む)] --DELETE X-->                            [担当者 n-1 名]
[担当者 n 名 (X 含まず)] --DELETE X-->                          [担当者 n 名 (404)]
```

### UI 状態遷移 (担当者領域)

```
モーダル open → 領域 loading → 一覧描画
一覧描画 → 「追加」 クリック → CardAssigneeAddForm 表示 → ユーザー選択 → submitting → success (一覧再取得) → 一覧描画
                                                                         ↘ error(422/409) → inline error 表示 → 再入力可能
一覧描画 → バッジの解除ボタン クリック → submitting → success (一覧再取得) → 一覧描画
                                                     ↘ error(404) → 一覧再取得 (他ユーザーによる同時削除を吸収)
モーダル閉じ → 領域 state 破棄
```

## 非機能の実装方針

### 性能

- 一覧取得は `@@index([cardId])` 経由で最大 10 件を返すのみ。P95 200ms 以内は SQLite で余裕。
- 追加 / 削除は 1 トランザクションで存在検証 (`user.findUnique` / `boardMembership.findUnique` / `cardAssignee.count`) + `cardAssignee.create` / `delete` + `card.update`。SQL 4〜5 本、P95 300ms 以内を達成する。
- 担当者候補一覧はサーバーコンポーネント側で 1 回のみ取得、モーダル開閉毎に再取得しない。

### セキュリティ

- 追加時の存在検証は「ユーザー存在 → ボード所属 → 上限」 の順で行う (`spec/000_shared_rules.md § Route Handler の入口チェック順序` を担当者検証内でも維持)。「存在の露出を避ける」 ため、`cardId` の閲覧権限判定を先に行い、`404` を優先する。
- 追加対象 `userId` 自身の権限は問わず (`viewer` も担当者として指名可能、`spec/009_assignee.md § 権限境界`)、操作者 (`actorId`) のみ `member` 以上を要求する。
- 削除の権限判定も操作者の `member` 以上のみ (削除対象ユーザー自身の権限は問わない)。自分自身の割当解除も同経路で扱う。
- レスポンスは `userId` のみ返却し、User の個人情報 (name 等) は本 API では返さない (画面側で候補一覧と突合する)。

### 運用

- 追加 / 削除操作の監査ログには `boardId` と対象 `userId` を必ず含める。owner による他ユーザーの割当変更を追跡可能にする。
- `409` (重複追加) は `warn` レベル、上限超過 (`422 assignees_limit_exceeded`) も `warn` レベルで記録する。UI 側の不整合検知に活用する。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/cards/{cardId}/assignees` | `requireCurrentUser` → `resolveBoardFromCard` → `assertBoardAccess(actorId, boardId, "viewer")` | 未認証 `401`、未存在 / 閲覧不可 `404` |
| `POST /api/cards/{cardId}/assignees` | `requireCurrentUser` → `resolveBoardFromCard` → `assertBoardAccess(actorId, boardId, "member")` → body 検証 → `userId` 存在 → `userId` のボード所属 → 上限 → create | 未認証 `401`、未存在 / 閲覧不可 `404`、`viewer` は `403`、重複は `409`、その他検証失敗 `422` |
| `DELETE /api/cards/{cardId}/assignees/{userId}` | `requireCurrentUser` → `resolveBoardFromCard` → `assertBoardAccess(actorId, boardId, "member")` → 割当関係存在確認 → delete | 未認証 `401`、未存在 / 閲覧不可 `404`、`viewer` は `403`、割当未存在 `404` |

- `assertBoardAccess` の判定単位は「操作者 (`actorId`) が所属するボードでの role」。担当対象ユーザー (`userId`) の権限判定は `boardMembership.findUnique` を独立に呼んで確認する (`viewer` 以上を許容する)。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `card.assignee.list` 成功 | `info` | `actorId`、`targetType=card`、`targetId=cardId`、`context={ boardId, count }`、`status=200` |
| `card.assignee.add` 成功 | `info` | `actorId`、`targetType=card`、`targetId=cardId`、`context={ boardId, userId }`、`status=201` |
| `card.assignee.remove` 成功 | `info` | `actorId`、`targetType=card`、`targetId=cardId`、`context={ boardId, userId }`、`status=204` |
| `card.assignee.add` 重複 | `warn` | `actorId`、`targetId=cardId`、`context={ boardId, userId }`、`status=409`、`errorCode="conflict"` |
| `card.assignee.add` 上限超過 | `warn` | `actorId`、`targetId=cardId`、`context={ boardId, userId, count: 10 }`、`status=422`、`errorCode="validation_error"` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成 (Board / List / Card 設計と共通)

- **単体テスト** … zod スキーマ (`parseAssigneeCreate`)、上限判定の pure 関数 (`lib/assignees/limit.ts` の `assertBelowLimit(currentCount)`)。
- **Route Handler テスト** (優先度中、実行環境が SQLite テスト DB 未整備のため本 TDD スコープではスキップ、`§ 実装順序` 手順 6 で追加) … 独立 SQLite テスト DB。`getCurrentUser` を差し替え、3 ロール × (成功 / 権限失敗 / 未参加) を網羅する。
- **UI テスト** (優先度低) … `CardAssigneesField` の追加 / 解除フロー、`viewer` に導線が出ないこと。

### ケース一覧 (spec/009_assignee.md § 受入条件 との対応)

| 種別 | ケース例 | 対応 spec 節 |
|---|---|---|
| 正常系 (schema) | `{ userId: "u1" }` → `{ userId: "u1" }` | § FR-01 / § バリデーション |
| バリデーション (schema) | `{}` → `422 required` / `{ userId: 123 }` → `422 invalid_type` / `{ userId: "" }` → `422 required` | § バリデーション |
| 上限 pure 関数 | `count=0..9` は許可、`count=10` は throw `422 assignees_limit_exceeded` | § 境界条件 |
| 正常系 (Route Handler、後続) | 0→1 追加、9→10 追加、10 の状態を確認、削除で 10→9、削除後同じ `userId` を再追加できる | § 境界条件 |
| 権限 (後続) | `viewer` の `POST` = `403`、`viewer` の `DELETE` = `403`、`viewer` の `GET` = `200`、未参加 = `404` |§ 権限境界 |
| 未存在 (後続) | 存在しない `cardId` の全 API = `404`、存在するが未割当の `userId` の `DELETE` = `404`、存在しない `userId` の `POST` = `422 assignee_not_found` | § 異常系 |
| 重複 (後続) | 割当済み `userId` の `POST` = `409 already_assigned` | § 異常系 |
| 上限 (後続) | 10 名割当済カードに 11 名目 `POST` = `422 assignees_limit_exceeded` | § 境界条件 |
| Board 所属 (後続) | 別ボードのユーザー `POST` = `422 assignee_not_in_board` | § 異常系 |

### 補助ヘルパ

- `tests/helpers/factories.ts` (未整備) に `createAssignee(card, user, {createdAt?})` を追加予定 (Route Handler テスト整備時)。
- 上限判定は Route Handler ではなく `lib/assignees/limit.ts` に切り出し、単体テストで境界 (0, 9, 10) を網羅する。

## 実装方針 (本設計で固定する判断)

- 担当者は最大 10 名の複数割当 (`spec/009_assignee.md § FR-01`)。単一 `assigneeId` フィールドは採用しない (中間テーブル方式)。
- 追加 / 削除の永続化は 1 トランザクション内で行い、Card の `updatedAt` を明示更新する (`spec/009_assignee.md § FR-01 / FR-02` の観測可能な完了条件)。
- 重複追加は `409 Conflict` (`spec/009_assignee.md § 異常系`)。`spec/000_shared_rules.md § HTTP ステータスコード` の 4 種以外を採用する本 spec 固有の追加。
- 順序は「候補ユーザーがあれば `viewer` 以上を含めて割当可」 (`spec/009_assignee.md § 境界条件`)。
- 上限判定は pure 関数 `lib/assignees/limit.ts` に切り出し、単体テストで境界 (10 / 11 名) を網羅する。
- 削除は物理削除 (`spec/009_assignee.md § FR-02`)、soft delete しない。
- 候補ユーザー取得 API (`GET /api/boards/{boardId}/members`) は本 spec 対象外。既存経路 (`BoardMembership` からサーバーコンポーネントで取得) を継承する。
- 追加 API の重複判定は「アプリ層で count → create」 ではなく「create 直後の `P2002` 捕捉」 を主とし、事前 count はあくまで 10 名上限判定用のみに使う (競合状態でも `409` に集約される)。

## 実装順序

1. **`design/001_boards.md` / `design/003_cards.md` の実装順序を先に完了させる**
   Board / List / Card 基本 CRUD と共通ユーティリティ (`getCurrentUser` / `assertBoardAccess` / `resolveBoardFromCard` / `withApiHandler` / `errors` / `audit`) が本設計の前提。
2. **Prisma schema 拡張と migration**
   `CardAssignee` モデルの新設と、`User.assignedCards` / `Card.assignees` の relation 追加を 1 migration で流す (`prisma migrate dev --name add_card_assignee`)。
3. **共通ユーティリティ**
   - `lib/http/errors.ts` に `ConflictError` / `conflictError()` を追加。
   - `lib/log/audit.ts` の `errorCode` union に `"conflict"` を追加。
   - `lib/http/withApiHandler.ts` に `ConflictError` の分岐を追加。
   - `lib/schemas/assignees.ts` を新設し `parseAssigneeCreate(body)` を実装 (`userId` 型 / 必須検証)。
   - `lib/assignees/limit.ts` を新設し `assertBelowLimit(count: number)` を pure 関数で実装 (10 名超過で `ValidationError` を throw)。
4. **Route Handler 実装**
   `app/api/cards/[cardId]/assignees/route.ts` の `GET` / `POST` → `app/api/cards/[cardId]/assignees/[userId]/route.ts` の `DELETE` の順で実装する。POST では zod → user 存在 → BoardMembership 存在 → 上限 → create の順を守る。
5. **UI コンポーネント接続**
   `CardAssigneesField` を `CardDetailModal` の担当者領域に配置 → `CardAssigneeAddForm` / `CardAssigneeBadge` を接続 → 候補は Context 経由で受ける。ロール別の導線表示分岐を実装する。
6. **テスト整備**
   pure 単体テスト (手順 3 の schema と limit) → Route Handler テスト (`§ テスト方針` のケース一覧を網羅) → UI テスト (領域独立性) の順で追加する。

## Red-Green-Refactor で扱う FR の順番

TDD (`/tdd` skill) で以下の順に Red-Green-Refactor を回す。前段で確立した pure 関数を後段で組み立てる依存関係。

1. **FR-01 (追加) の schema バリデーション** (`parseAssigneeCreate`)
   - Red = 空 body / `userId` 型不一致 / 空文字が `ValidationError` を throw することを assert。
   - Green = `lib/schemas/assignees.ts` を実装。
   - Refactor = 既存 `parseCardCreate` / `parseCardUpdate` と同じ zod パターン (`runSchema` helper) に揃える。
2. **FR-01 (追加) の上限判定 pure 関数** (`assertBelowLimit`)
   - Red = `count=0..9` は例外なし、`count=10` は `ValidationError({ userId: "assignees_limit_exceeded" })`、`count=11` (異常系) も throw することを assert。
   - Green = `lib/assignees/limit.ts` を実装。
   - Refactor = 上限値 `10` を定数として export し、schema 側や UI 側から参照可能にする。
3. **FR-02 (削除) の権限 / 存在検証は既存 `assertBoardAccess` / `resolveBoardFromCard` で満たされるため、追加 pure 関数なし** (Route Handler 実装フェーズで検証)。
4. **FR-03 (一覧) は Route Handler フェーズで検証** (Prisma のクエリ順序に依存するため単体テスト化しない)。
5. **FR-04 (画面表示) は UI テスト範囲** (本 TDD スコープ外、`§ 実装順序` 手順 6)。

本 TDD スコープでは (1) と (2) の Red-Green-Refactor をユニットテストで完結させ、Route Handler / UI は `§ 実装順序` の手順 4 以降で順次追加する。Route Handler の追加は SQLite テスト DB helper (`tests/helpers/db.ts` 未整備) と連動して別 PR で実施する前提とする。
