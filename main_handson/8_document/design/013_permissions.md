# 権限管理機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/001_boards.md`
- `spec/011_auth.md`
- `spec/012_member_invite.md`
- `spec/013_permissions.md`

## 前提

Prisma 全体スキーマ、認証・認可の共通ユーティリティ (`requireCurrentUser` / `assertBoardAccess` / `getBoardRole`)、エラーレスポンスヘルパ、監査ログ形式、バリデーション方針 (zod)、`withApiHandler` は `design/001_boards.md § 共通設計方針` を参照する。
認証機構 (Cookie ベース / Session) は `design/011_auth.md` を継承する。
本 file は `spec/013_permissions.md` を満たす権限管理機能 (メンバー一覧 / ロール変更 / メンバー削除 / 最後の owner 保護 / viewer 閲覧専用) の設計に閉じる。

## 既存設計との差分

- 本 spec の対象データは既存 `BoardMembership` のみ (新規モデルなし)。migration 不要。
- `TargetType` に `"member"` を追加する (`lib/log/audit.ts`)。
- 「最後の owner 保護」 制約を pure 関数 (`lib/permissions/lastOwner.ts`) として実装し、Route Handler は判定呼出のみに責務を絞る。
- `assertBoardAccess` / `getBoardRole` は本 spec で書き換えない (認証 middleware 側で毎回 DB を引く、`spec/013_permissions.md § 非機能要件 § セキュリティ` に一致)。

## データモデル

### BoardMembership モデル (既存、追加変更なし)

既存フィールドは `design/001_boards.md § データモデル > Prisma スキーマ` を参照する。本 spec で以下の relation 追加 (User 側の関係名を明示するのみ、field 追加なし)。

```prisma
model BoardMembership {
  boardId   String
  userId    String
  role      Role
  createdAt DateTime @default(now())

  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([boardId, userId])
  @@index([userId])
  @@index([boardId, role])  // 最後の owner 判定と一覧ソートで使う
}
```

- `@@index([boardId, role])` を追加する (`prisma migrate dev --name add_permissions_index`)。`owner` 総数のカウントとメンバー一覧のロール順ソートで使う。既存 `@@id([boardId, userId])` / `@@index([userId])` は変更しない。

### JSON 表現

BoardMember (メンバー一覧 API のレスポンス要素)。

```json
{
  "userId": "usr_abc",
  "name": "User Name",
  "email": "user@example.com",
  "role": "member",
  "createdAt": "2026-07-12T10:00:00.000Z"
}
```

- 一覧 API のレスポンスは `{ items: BoardMember[] }`。
- ロール変更 API のレスポンスは更新後の `BoardMember` オブジェクト。
- 削除 API はレスポンス body なしで `204` を返す。

### 補助関数

`lib/permissions/lastOwner.ts` に以下を配置する。

```ts
import type { Role } from "@prisma/client";

export type LastOwnerInput = {
  currentOwnerCount: number;
  targetCurrentRole: Role;
  operation: "change_role" | "remove";
  newRole?: Role;  // operation="change_role" のときのみ
};

export function isLastOwnerProtected(input: LastOwnerInput): boolean {
  const { currentOwnerCount, targetCurrentRole, operation, newRole } = input;
  if (targetCurrentRole !== "owner") return false;
  if (currentOwnerCount > 1) return false;
  if (operation === "remove") return true;
  if (operation === "change_role" && newRole !== "owner") return true;
  return false;
}
```

- `currentOwnerCount = 1` かつ 対象が `owner` かつ (削除 or `owner` 以外への変更) の場合のみ `true` を返す。
- 対象が `owner` でない、または `owner` が 2 名以上いる場合は常に `false`。
- `operation="change_role"` で `newRole="owner"` の場合 (同ロール変更) は `false` (冪等)。

## API 設計

`spec/013_permissions.md § API` の 3 endpoint を Route Handler で実装する。file 配置。

- `app/api/boards/[boardId]/members/route.ts` … `GET`
- `app/api/boards/[boardId]/members/[userId]/route.ts` … `PATCH` / `DELETE`

### `GET /api/boards/{boardId}/members` メンバー一覧

- 入力 = パスパラメータ `boardId`。
- 権限 = 対象ボードの `viewer` 以上。
- 処理。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `assertBoardAccess(user.id, boardId, "viewer")`、未参加は `404`。
  3. `memberships = prisma.boardMembership.findMany({ where: { boardId }, include: { user: { select: { id: true, email: true, name: true } } } })`。
  4. ロール順 (owner > member > viewer) を適用してソート、同ロール内は `createdAt` 昇順 → `userId` 昇順。
- 出力 = `200 { items: BoardMember[] }` (各要素は `{ userId, name, email, role, createdAt }`)。
- ステータス = `200` / `401` / `404`。
- ログ = `event=member.list`、`targetType=member`、`targetId=null`、`context={ boardId, count }`。

### `PATCH /api/boards/{boardId}/members/{userId}` ロール変更

- 入力 = パスパラメータ `boardId` / `userId`、body = `{ role: "owner" | "member" | "viewer" }`。
- 権限 = 対象ボードの `owner`。
- バリデーション (zod、`lib/schemas/members.ts` の `parseRoleUpdate`)。
  - `role` = 文字列、`owner` / `member` / `viewer` のいずれか、それ以外は `invalid_value`。
  - 未指定は `required`、文字列でないなら `invalid_type`。
- 処理 (1 トランザクション)。
  1. `assertBoardAccess(user.id, boardId, "owner")`、`owner` 以外は `403`、未参加は `404`。
  2. body を zod 検証。
  3. `target = tx.boardMembership.findUnique({ where: { boardId_userId: { boardId, userId } } })`、未存在なら `404`。
  4. `newRole === target.role` (冪等) なら `boardMembership.update({ ... , data: {} })` は不要、`200` を返して終了 (`§ 境界条件 § ロール変更の遷移`)。以降の owner 判定もスキップ。
  5. `ownerCount = tx.boardMembership.count({ where: { boardId, role: "owner" } })`。
  6. `isLastOwnerProtected({ currentOwnerCount: ownerCount, targetCurrentRole: target.role, operation: "change_role", newRole })` が `true` なら `422 { role: "last_owner" }`。
  7. `updated = tx.boardMembership.update({ where: { boardId_userId: { boardId, userId } }, data: { role: newRole } })`。
- 出力 = `200 BoardMember`。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=member.role_change`、`targetType=member`、`targetId=userId`、`context={ boardId, oldRole: target.role, newRole }`。

### `DELETE /api/boards/{boardId}/members/{userId}` メンバー削除

- 入力 = パスパラメータ `boardId` / `userId`。body なし。
- 権限 = 対象ボードの `owner` または本人。
- 処理 (1 トランザクション)。
  1. `user = requireCurrentUser(request)`、未認証なら `401`。
  2. `{ role } = assertBoardAccess(user.id, boardId, "viewer")`、未参加は `404`。
  3. `target = tx.boardMembership.findUnique({ where: { boardId_userId: { boardId, userId } } })`、未存在なら `404`。
  4. 権限判定 = `isSelf = user.id === userId`、`isOwner = role === "owner"`。`!isSelf && !isOwner` なら `403`。
  5. `ownerCount = tx.boardMembership.count({ where: { boardId, role: "owner" } })`。
  6. `isLastOwnerProtected({ currentOwnerCount: ownerCount, targetCurrentRole: target.role, operation: "remove" })` が `true` なら `422 { userId: "last_owner" }`。
  7. `tx.boardMembership.delete({ where: { boardId_userId: { boardId, userId } } })`。
- 出力 = `204 No Content`。
- ステータス = `204` / `401` / `403` / `404` / `422`。
- ログ = `event=member.remove`、`targetType=member`、`targetId=userId`、`context={ boardId, oldRole: target.role, selfRemoval: isSelf }`。

## UI 構造

### 配置

- ボード詳細画面 (`app/boards/[boardId]/page.tsx`) にメンバー管理領域を追加する。
- `viewer` / `member` はメンバー一覧のみを表示する。
- `owner` は招待作成 (`design/012_member_invite.md`) + ロール変更 + 削除ボタンを表示する。
- 自身の脱退ボタンは `member` / `viewer` にも表示する (`owner` は最後の owner 判定を経て 422 を返す)。

### 主要 Client Component

| コンポーネント | 責務 |
|---|---|
| `BoardMemberList` | 対象ボードのメンバー一覧を fetch 表示。 owner 時はロール変更 / 削除操作を各行に表示、それ以外は閲覧のみ。 |
| `MemberRoleSelect` | 1 メンバー行のロール変更 select box (`owner` / `member` / `viewer`)。 変更で `PATCH` を叩く。 |
| `MemberRemoveButton` | 1 メンバー行の削除ボタン。 確認ダイアログ → `DELETE` → 成功時に一覧再取得。 |
| `LeaveBoardButton` | 自身の脱退ボタン (member / viewer 向け)。 owner 用 UI と別配置。 |

### 領域内の状態

- `BoardMemberList` = `idle → loading → success (items) | error`。
- `MemberRoleSelect` = `idle → submitting → success (一覧再取得) | error(inline: 422 last_owner / 403)`。
- `MemberRemoveButton` = `idle → confirming → submitting → success (一覧再取得) | error(inline: 422 last_owner / 403)`。
- `LeaveBoardButton` = `idle → confirming → submitting → success (router.push("/")) | error(inline: 422 last_owner)`。

### 表示分岐

- `viewer`: 一覧の各行に `userId` / `name` / `email` / `role` / `createdAt` のみ表示。ロール変更 / 削除ボタンは DOM に出さない。
- `member`: `viewer` と同じ + 自身の行に「脱退」 ボタンのみ。
- `owner`: 全ての行にロール変更 select と削除ボタン。自身の行にも脱退ボタン (最後の owner の場合 422 で拒否される)。

## 状態遷移

### エンティティ状態

BoardMembership (1 メンバーシップあたり)。

```
[未参加]                     --Invite accept (spec/012)--> [参加 (role = 招待時の role)]
[参加 (role=A)]              --PATCH role=B (owner のみ)--> [参加 (role=B)]
[参加 (role=owner, ownerCount=1)] --PATCH role=<非owner>-->  [参加 (role=owner)]  (422 last_owner)
[参加]                       --DELETE (owner or 本人)--> [未参加]
[参加 (role=owner, ownerCount=1)] --DELETE-->                [参加 (role=owner)]  (422 last_owner)
[参加]                       --Board 削除 (cascade)--> [削除済]
[参加]                       --User 削除 (cascade)-->  [削除済]
```

### UI 状態遷移 (メンバー管理領域)

```
ボード詳細画面 open → BoardMemberList が GET を叩く → loading → success 描画
一覧描画 → owner が MemberRoleSelect で変更 → submitting → success (再取得) | error(422 last_owner)
一覧描画 → owner が MemberRemoveButton クリック → confirming → submitting → success (再取得) | error
一覧描画 → 本人が LeaveBoardButton クリック → confirming → submitting → success (router.push("/")) | error
```

## 非機能の実装方針

### 性能

- 一覧取得は `@@index([boardId, role])` + `include: { user }` の JOIN 1 本。100 名未満想定、P95 200ms 以内。
- ロール変更 / 削除は 1 トランザクション内で `findUnique` + `count` + `update / delete` の 3 クエリ。`count` は `@@index([boardId, role])` で高速。P95 300ms 以内。
- 認証チェックは既存の `assertBoardAccess` (1 SELECT) を継承。キャッシュ経路なし (`spec/013_permissions.md § 境界条件 § ロール変更の後方影響`)。

### セキュリティ

- ロール変更 / 削除は同一トランザクション内で `owner` 総数の集計 + 判定を行う (`§ API 設計`)。トランザクション外で count → update の 2 step で分けるとレース時に「最後の owner 」 を同時に降格できてしまう。Prisma の `$transaction` (interactive) は SQLite の serializable レベル (BEGIN IMMEDIATE) で書き込みを直列化する。
- `PATCH` / `DELETE` API のレスポンス body 生成時、レスポンス上に User の個人情報 (`email` / `name`) を含めるため、認証 + 閲覧権限判定 (`assertBoardAccess("viewer")`) を経てからのみ返す。
- `viewer` に対して owner 用 UI (ロール変更 / 削除) を DOM 上に出さない設計とする。API 側の `403` は最後の防御。
- 「自身の削除」 と「他ユーザーの削除」 の権限判定は `isSelf` 判定を Route Handler 内で行う。owner 権限を経路として利用する UI からは、自身の削除も `DELETE` の同一 endpoint を叩く (別 endpoint を用意しない)。

### 運用 (操作ログ)

- ロール変更成功時、`event=member.role_change`、`context={ boardId, oldRole, newRole }` を info 記録。
- メンバー削除成功時、`event=member.remove`、`context={ boardId, oldRole, selfRemoval }` を info 記録。
- 最後の owner 保護発火 (`422 last_owner`) は `warn` レベルで記録。owner 保護制約の発火頻度を観測できる。
- 冪等な同ロール変更 (`newRole === oldRole`) も `event=member.role_change` を info 記録 (`context.oldRole === context.newRole`)。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `GET /api/boards/{boardId}/members` | `requireCurrentUser` → `assertBoardAccess(actorId, boardId, "viewer")` | 未認証 `401`、未参加 `404` |
| `PATCH /api/boards/{boardId}/members/{userId}` | `requireCurrentUser` → `assertBoardAccess(actorId, boardId, "owner")` → target 存在 → 冪等判定 → owner 総数集計 → `isLastOwnerProtected` → update | 未認証 `401`、`403`、`404`、`422 last_owner` / `role invalid_value` |
| `DELETE /api/boards/{boardId}/members/{userId}` | `requireCurrentUser` → `assertBoardAccess(actorId, boardId, "viewer")` → target 存在 → (`isSelf || isOwner`) → owner 総数集計 → `isLastOwnerProtected` → delete | 未認証 `401`、`403` (`!isSelf && !isOwner`)、`404`、`422 last_owner` |

- 削除の権限判定は「閲覧権限 → 対象存在 → self or owner → last owner」 の 4 段。判定順は「認証 → 存在 → 権限 → バリデーション」 (`spec/000_shared_rules.md § Route Handler の入口チェック順序`) に一致する (`isSelf || isOwner` は権限判定、`last_owner` はバリデーション相当)。
- 認証は Cookie ベースで、毎リクエストで DB Session 引き + BoardMembership 引きを行う。キャッシュなし (即時反映)。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `member.list` 成功 | `info` | `actorId`、`targetType=member`、`targetId=null`、`context={ boardId, count }`、`status=200` |
| `member.role_change` 成功 | `info` | `actorId`、`targetType=member`、`targetId=userId`、`context={ boardId, oldRole, newRole }`、`status=200` |
| `member.remove` 成功 | `info` | `actorId`、`targetType=member`、`targetId=userId`、`context={ boardId, oldRole, selfRemoval }`、`status=204` |
| 最後 owner 保護 (`422 last_owner`) | `warn` | `actorId`、`targetId=userId`、`context={ boardId, currentOwnerCount, operation }`、`status=422`、`errorCode="validation_error"` |
| 全操作の `401` / `403` / `404` / `5xx` | `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成

- **単体テスト** … zod schema (`parseRoleUpdate`)、`isLastOwnerProtected` の 6 パターン (owner 1 名 × 3 操作、owner 2 名以上 × 3 操作)、メンバーソート helper (`sortMembers`)。
- **Route Handler テスト** (優先度中、SQLite テスト DB helper 未整備のため本 TDD スコープではスキップ) … 独立 SQLite テスト DB。owner による role 変更 / 削除、self 脱退、最後 owner 保護、viewer の 403、非メンバーの 404 を網羅。
- **UI テスト** (優先度低) … `BoardMemberList` の権限別表示分岐 (viewer / member / owner)。

### ケース一覧 (spec/013_permissions.md § 受入条件 との対応)

| 種別 | ケース例 | 対応 spec 節 |
|---|---|---|
| 正常系 (schema) | `{ role: "owner" }` → 受理 / `{ role: "member" }` / `{ role: "viewer" }` | § FR-02 / § バリデーション |
| バリデーション (schema) | `{}` → required / `{ role: 123 }` → invalid_type / `{ role: "admin" }` → invalid_value | § バリデーション |
| lastOwner (pure) | `{ count: 1, targetRole: "owner", op: "remove" }` → true / `{ count: 1, targetRole: "owner", op: "change_role", newRole: "member" }` → true / `{ count: 1, targetRole: "owner", op: "change_role", newRole: "owner" }` → false (冪等) / `{ count: 2, ... }` → 常に false / `{ targetRole: "member", ... }` → 常に false | § FR-04 / § 境界条件 |
| ソート (pure) | 混在ロールのリストが owner → member → viewer 順、同ロールは createdAt 昇順 → userId 昇順 | § FR-01 |
| 正常系 (Route Handler、後続) | owner が member を owner に昇格 / owner が viewer を member に変更 / member が自身脱退 → 204 | § FR-02 / FR-03 |
| 権限 (後続) | member の PATCH → 403 / viewer の PATCH → 403 / member が他人 DELETE → 403 / viewer が本 spec GET → 200 | § FR-05 |
| lastOwner (後続) | owner 1 名の PATCH member → 422 / owner 1 名の DELETE (self) → 422 / owner 2 名にしてから片方降格 → 200 | § FR-04 |
| 未存在 (後続) | 存在しない boardId → 404 / 存在しない userId (対象ボードのメンバーでない) → 404 | § 異常系 |

### 補助ヘルパ

- `tests/schemas/members.test.ts` に `parseRoleUpdate` の pure 単体テスト。
- `tests/permissions/lastOwner.test.ts` に `isLastOwnerProtected` の 6 パターンテスト。
- `tests/permissions/sortMembers.test.ts` にロール順ソートのテスト。

## 実装方針 (本設計で固定する判断)

- 最後の owner 保護判定は pure 関数 `isLastOwnerProtected` に切り出し、Route Handler は入力を集めて呼ぶだけに責務を絞る。
- `owner` 総数のカウントとロール変更 / 削除は同一トランザクション内で実行する (レース回避)。
- 冪等な同ロール変更 (`newRole === oldRole`) は最後 owner 判定をスキップして `200` を返す (`isLastOwnerProtected` は `false` を返すため、実装上は判定を経ても同じ挙動になる、単純化のため `newRole === oldRole` の早期 return を採用)。
- 認証 middleware は毎リクエストで DB Session + BoardMembership を引く (無キャッシュ、`spec/013_permissions.md § 境界条件`)。
- メンバー一覧のソートは Route Handler 内 (`sortMembers`) で行う。DB 側でカスタム順序 (owner → member → viewer) を表現するには `CASE WHEN` が必要で、Prisma で expression-based orderBy は書きづらい。データ量が小さい (100 名未満想定) ため in-memory ソートで十分。
- 削除 API は「本人 or owner」 の権限判定を Route Handler 内で行う。別 endpoint (`/leave`) は用意せず、`DELETE /api/boards/{boardId}/members/{userId}` の 1 endpoint に集約する。
- ロール変更で `role: "owner"` を指定した場合、対象ユーザーは新規に `owner` になる (既存 `owner` の権限はそのまま)。owner 総数は増える。`spec/013_permissions.md § 境界条件 § ロール変更の遷移` に一致。

## 実装順序

1. **`design/011_auth.md` の実装順序を先に完了させる**
   認証機構と Cookie ベースの `getCurrentUser` が本設計の前提。
2. **Prisma schema の index 追加と migration**
   - `BoardMembership` に `@@index([boardId, role])` を追加。
   - `prisma migrate dev --name add_permissions_index` を流す。
3. **共通ユーティリティ**
   - `lib/log/audit.ts` の `TargetType` に `"member"` を追加。
   - `lib/schemas/members.ts` に `parseRoleUpdate(body)` を実装。
   - `lib/permissions/lastOwner.ts` に `isLastOwnerProtected(input)` を pure 関数で実装。
   - `lib/permissions/sortMembers.ts` にロール順ソート helper を実装。
4. **Route Handler 実装**
   - `app/api/boards/[boardId]/members/route.ts` の `GET` → `[userId]/route.ts` の `PATCH` / `DELETE` の順で実装する。
5. **UI 実装**
   - `components/members/BoardMemberList.tsx` + `MemberRoleSelect.tsx` + `MemberRemoveButton.tsx` + `LeaveBoardButton.tsx`。
   - ボード詳細画面 (`app/boards/[boardId]/page.tsx`) にメンバー管理領域を追加。招待管理領域 (`design/012_member_invite.md`) と統合。
6. **テスト整備**
   - `tests/schemas/members.test.ts` / `tests/permissions/lastOwner.test.ts` / `tests/permissions/sortMembers.test.ts` の 3 pure 単体テスト。

## Red-Green-Refactor で扱う FR の順番

TDD (`/tdd` skill) で以下の順に Red-Green-Refactor を回す。

1. **最後 owner 保護 pure 関数** (`isLastOwnerProtected`)
   - Red = 6 パターン (owner 1 名 × 3 操作、owner 2 名以上 × 3 操作、target が非 owner) の期待値を assert。
   - Green = `lib/permissions/lastOwner.ts` を実装。
   - Refactor = 早期 return で 3 条件を単純化。
2. **ロール変更 schema** (`parseRoleUpdate`)
   - Red = `{}` → required、`{ role: 123 }` → invalid_type、`{ role: "admin" }` → invalid_value、`{ role: "owner" | "member" | "viewer" }` → 受理。
   - Green = `lib/schemas/members.ts` を実装。
3. **メンバーソート pure 関数** (`sortMembers`)
   - Red = 混在ロール入力が owner → member → viewer 順、同ロール内は createdAt 昇順 → userId 昇順。
   - Green = `lib/permissions/sortMembers.ts` を実装。
4. **Route Handler は SQLite テスト DB helper 整備後 (本 TDD スコープ外)。**

## 作成または更新したファイル

- `design/013_permissions.md` (新規作成)
