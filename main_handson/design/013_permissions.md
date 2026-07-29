# 権限管理の設計

## 関連仕様

- spec/013_permissions.md / spec/000_shared_rules.md / constitution.md
- spec/001_boards.md（ボード作成時の owner 付与・一覧の絞り込み）/ spec/011_auth.md / spec/012_member_invite.md

## 前提

- design/011_auth.md（User / Session / `requireUser`）に依存する。
- **BoardMembership と BoardRole enum を新規追加する（未実装のため要 migration）**。
- 本設計で、既存 design/001-009 が「後続で接続」としていたロール判定の実体を確定し、**全 API に接続する**。

## 既存設計との差分（重要）

design/001-009 は「認証・ロール解決は未接続、コア段階は権限チェックを通過」を前提にしていた。本設計でこれを解消する。

1. **全 Route Handler に認証・権限チェックを実接続**する（下表「権限チェックの配置」）。
2. **`GET /api/boards` はメンバーであるボードのみ**を返す（design/001 の全件返却から変更。spec/001 更新済み）。
3. **`POST /api/boards` は認証済みなら実行可**とし、作成と同時に作成者の owner メンバーシップを作る（同一トランザクション）。design/001 の「owner 権限が必要」から変更。
4. **ボード削除の cascade に BoardMembership / Invite を含める**（design/001 の cascade を拡張）。
5. 既存の一覧・詳細取得はボードスコープの権限判定を通すため、非メンバーには 404 を返す。

## データモデル

```prisma
enum BoardRole {
  owner
  member
  viewer
}

model BoardMembership {
  id        String    @id @default(cuid())
  boardId   String
  userId    String
  role      BoardRole
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
  @@index([boardId])
  @@index([userId])
}
```

- Board 側に `memberships BoardMembership[]`、User 側に `memberships BoardMembership[]` を追加。
- ボード削除時に cascade 削除（Invite も同様。design/012）。
- ロールの強さ: `owner(2) > member(1) > viewer(0)`。

## 権限判定の共通部品

`lib/auth/permissions.ts`（全機能が使う中核）。

```ts
export type BoardRole = "owner" | "member" | "viewer";
const RANK: Record<BoardRole, number> = { viewer: 0, member: 1, owner: 2 };

export type AccessResult =
  | { kind: "ok"; role: BoardRole }
  | { kind: "unauthorized" }   // 未認証 → 401
  | { kind: "not_found" }      // ボード無し / 非メンバー → 404
  | { kind: "forbidden" };     // メンバーだが権限不足 → 403

// 認証 → 対象存在 → 権限 の順で判定する
export async function checkBoardAccess(boardId: string, minRole: BoardRole): Promise<AccessResult>;
// リスト/カード等から boardId を解決してから checkBoardAccess を呼ぶヘルパ
export async function checkListAccess(listId: string, minRole: BoardRole): Promise<AccessResult>;
export async function checkCardAccess(cardId: string, minRole: BoardRole): Promise<AccessResult>;
```

- 判定順: `requireUser()` で未認証 → `unauthorized`。Board 不存在 → `not_found`。メンバーシップ無し → **`not_found`**（存在を漏らさない）。`RANK[role] < RANK[minRole]` → `forbidden`。
- Route Handler は結果を共通ヘルパで HTTP に写像する（401 / 404 / 403）。

## API設計

### GET /api/boards/[boardId]/members — メンバー一覧（viewer 以上）

- 認証 → Board 存在 → viewer 以上（非メンバー 404）。
- 出力: `{ items: [{ userId, name, email, role }] }` / 200。**`passwordHash` を含めない**（select で明示）。

### PATCH /api/boards/[boardId]/members/[userId] — ロール変更（owner）

- 認証 → Board 存在 → owner（member/viewer は 403、非メンバーは 404）→ 対象メンバーシップ存在（404）→ 入力検証。
- 検証（422）: `role ∈ {owner, member, viewer}`。
- 制約（409）: 対象が owner かつ **そのボードの owner 数が 1** で、変更後が owner 以外（＝最後の owner の降格）。自分自身の降格にも同じ判定を適用。
- 処理: 1 トランザクション内で owner 数を数えてから更新（同時実行での owner 消失を防ぐ）。
- 出力: 更新後メンバー / 200。ログ: `member.role_change`（before/after を記録）。

### DELETE /api/boards/[boardId]/members/[userId] — メンバー削除（owner）

- 認証 → Board 存在 → owner → 対象メンバーシップ存在（404）。
- 制約（409）: 対象が owner かつ owner 数が 1（最後の owner の削除）。
- 処理: BoardMembership を削除（1 トランザクション内で owner 数を確認）。
- 出力: `{ ok: true }` / 200。ログ: `member.remove`。
- 自主退出は提供しない（member/viewer が自分を削除しようとしても owner 判定で 403）。

### 既存 API への適用（最小権限）

| API | 必要ロール |
|---|---|
| GET /api/boards | 認証済み（メンバーのボードのみ返す） |
| POST /api/boards | 認証済み（作成者を owner としてメンバーシップ作成） |
| GET /api/boards/[boardId] | viewer 以上 |
| PATCH / DELETE /api/boards/[boardId] | owner |
| GET lists / cards / search / labels / assignees | viewer 以上 |
| POST / PATCH / DELETE lists・cards・move・archive・unarchive・restore・labels・assignees | member 以上 |
| DELETE /api/cards/[cardId]/purge | owner |

## UI構造

- `/boards/[boardId]/members`（メンバー管理。design/012 の招待領域と同一画面）
  - 領域: メンバー一覧（名前・email・ロール）／ ロール変更セレクト（owner のみ）／ 削除操作（owner のみ）／ 招待領域（design/012）。
  - 最後の owner の行は降格・削除の操作を無効化（サーバーも 409 で拒否）。自分の行を識別表示。
  - owner 以外は一覧の閲覧のみ（操作を描画しない）。
- 権限による表示制御: ボード詳細でも viewer には作成・編集・移動系の操作を描画しない（サーバーの 403 と二重で担保）。
- 状態の所在: メンバー一覧はサーバー取得、変更後は `router.refresh()`。
- 部品分類は design-system のトークンと shadcn component に従う。

## 状態遷移

- BoardMembership: 非メンバー →（ボード作成 / 招待承認）→ メンバー（owner / member / viewer）→（ロール変更）→ 別ロール →（削除）→ 非メンバー。
- 不変条件: 各ボードの owner 数 >= 1（降格・削除の前に検査し、違反する操作は 409）。
- UI: 一覧表示 → 変更中 → 反映 / エラー（403・409）。

## 非機能の実装方針

### 性能

- 権限判定は `@@unique([boardId, userId])` で1件を検索する。ボード一覧はmembershipを経由する1つのクエリで取得する。一覧の応答時間は200ms以内、書き込みの応答時間は300ms以内。
- 判定は各リクエストで実行する（キャッシュしない。ロール変更の即時反映を優先）。

### セキュリティ

- 非メンバーには 404（存在を漏らさない）、メンバーの権限不足は 403 と厳密に区別する。
- 判定順序「認証 → 対象存在 → 権限 → 入力検証」を全ハンドラで統一する。
- 最後の owner の降格・削除を 409 で拒否し、管理不能なボードを作らない。
- ロール変更・削除は owner 数の確認と更新を同一トランザクションで行う。
- メンバー一覧で `passwordHash` を返さない（select 明示）。

### 運用

- ロール変更・メンバー削除、および権限拒否（403 / 404）を requestId 付きで記録。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET members | 認証 → Board存在 → viewer以上 | 401 / 404 / (非メンバー)404 |
| PATCH members/[userId] | 認証 → Board存在 → owner → 対象存在 → role検証 → 最後のowner判定 | 401 / 404 / 403 / 404 / 422 / 409 |
| DELETE members/[userId] | 認証 → Board存在 → owner → 対象存在 → 最後のowner判定 | 401 / 404 / 403 / 404 / 409 |
| 既存の閲覧系 | 認証 → 対象存在 → viewer以上 | 401 / 404 |
| 既存の書き込み系 | 認証 → 対象存在 → member以上 → 入力検証 | 401 / 404 / 403 / 422 |
| ボード編集・削除・purge | 認証 → 対象存在 → owner | 401 / 404 / 403 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| ロール変更 | info | requestId, member.role_change, boardId, targetUserId, beforeRole, afterRole, actorUserId |
| メンバー削除 | info | requestId, member.remove, boardId, targetUserId, actorUserId |
| 最後のowner拒否 | warn | requestId, member.last_owner_denied, boardId, targetUserId |
| 権限拒否 | warn | requestId, access.denied, boardId, requiredRole, actualRole（非メンバーは null）|
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- 権限判定は `lib/auth/permissions.ts` の `checkBoardAccess` / `checkListAccess` / `checkCardAccess` に集約し、各 Route Handler では結果を HTTP に写像するのみとする（判定ロジックの重複と実装差異を防ぐ）。
- 「非メンバー = 404」を `AccessResult` の型で表現し、403 と取り違えないようにする。
- 最後の owner 判定は **`countOwners(boardId) <= 1` かつ 対象が owner かつ 変更後が owner でない**（削除は無条件に owner 減）で判定し、ロール変更・削除の両方で同一関数を使う。
- ロールの比較は数値ランクで行い、文字列比較を各所に散らさない。
- ボード作成時の owner メンバーシップ作成は `boardRepository.create` 内で 1 トランザクションに含める（作成者が自分のボードに 404 になる事故を防ぐ）。

## テスト方針

- Vitest。in-memory prisma mock に `user` / `session` / `boardMembership` / `invite` を追加し、既存の kanban テストを認証付きに更新する（ヘルパで「ログインして owner のボードを作る」を用意）。
- ケース:
  - members 一覧: 200・`{ items }`・`passwordHash` を含まない・非メンバー 404・未認証 401。
  - ロール変更: owner→200・member 403・viewer 403・role 不正 422・対象なし 404・**最後の owner 降格 409**・owner 2 人なら降格成功。
  - メンバー削除: owner→200・**最後の owner 削除 409**・owner 2 人なら成功・member 403・削除後に対象が 404。
  - viewer 閲覧専用: ボード編集 403 / リスト作成 403 / カード作成 403 / カード移動 403 / 閲覧 200。
  - member 制限: ボード削除 403 / purge 403。
  - 非メンバー: ボード・リスト・カードの参照が 404。
  - ボード作成: 認証済みで 201・owner メンバーシップ生成・直後の詳細取得 200。
  - ボード一覧: 自分がメンバーのボードのみ返る。
  - cascade: ボード削除で membership / invite も消える。

## 実装順序

1. Prisma に BoardRole / BoardMembership を追加、Board・User にリレーション追加 ＋ migration（design/011 の User と同時）。理由: 全 API が依存。
2. `lib/auth/permissions.ts`（checkBoardAccess / checkListAccess / checkCardAccess / countOwners）。理由: 全 Route Handler が依存。
3. `boardRepository.create` を owner メンバーシップ作成込みのトランザクションに変更、`list` をメンバー絞り込みに変更。
4. members API（一覧・ロール変更・削除）。
5. 既存 Route Handler へ権限チェックを適用（閲覧 viewer 以上 / 書き込み member 以上 / ボード編集・削除・purge は owner）。
6. UI（メンバー管理画面、権限による操作の出し分け）。
7. テスト（既存テストの認証対応を含む）。

## 未決事項

- 自主退出は対象外（spec/013 で確定）。将来要件で再検討。
- ロール判定のキャッシュは行わない（即時反映を優先）。負荷が問題になった場合に再検討。
