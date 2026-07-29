# メンバー招待の設計

## 関連仕様

- spec/012_member_invite.md / spec/000_shared_rules.md / constitution.md
- spec/011_auth.md（認証）/ spec/013_permissions.md（BoardMembership・ロール）

## 前提

- design/011_auth.md（User / Session / `generateToken` / `requireUser`）と design/013_permissions.md（BoardMembership・ロール判定）に依存する。
- **Invite を新規追加する（未実装のため要 migration）**。
- 招待トークンは design/011 の `generateToken()`（CSPRNG 32 バイト・base64url）を共用する。

## データモデル

```prisma
enum InviteStatus {
  pending
  accepted
  revoked
}

model Invite {
  id              String       @id @default(cuid())
  boardId         String
  email           String
  role            BoardRole    // member / viewer のみ（design/013 の enum を共用）
  token           String       @unique
  status          InviteStatus @default(pending)
  expiresAt       DateTime
  invitedByUserId String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  board     Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  invitedBy User  @relation(fields: [invitedByUserId], references: [id], onDelete: Cascade)

  @@index([boardId])
  @@index([email])
}
```

- ボード削除時に Invite も cascade 削除（`spec/000_shared_rules.md` § 削除の連鎖）。
- `role` は `BoardRole` enum を共用するが、**owner の指定は入力検証で 422 として弾く**（DB 型では表現できないためアプリ層で担保）。
- 「同一ボード・同一 email の `pending` は 1 件」は部分ユニーク制約が SQLite/Prisma で表現しづらいため、**作成時にアプリ層で検査**して 409 を返す（DB 制約に依存しない）。

## API設計

入口チェック順序は「認証 → 対象存在 → 権限 → 入力検証」。

### GET /api/boards/[boardId]/invites — 招待一覧（owner）

- 認証（401）→ Board 存在（404）→ 呼び出しユーザーのロール判定（非メンバー 404 / owner 以外 403）。
- 出力: `{ items: [{ id, email, role, status, expiresAt, createdAt }] }` / 200。**`token` は含めない**。

### POST /api/boards/[boardId]/invites — 招待作成（owner）

- 認証 → Board 存在 → owner 判定 → 入力検証。
- 検証（422）: `email` 形式（design/011 と同一の簡易正規表現）／`role ∈ {member, viewer}`（`owner` は 422）。
- 衝突（409）: 同一ボード・同一 email の `pending` 招待が存在／その email のユーザーが既にそのボードのメンバー。
- 処理: `token = generateToken()`、`expiresAt = now + 7 日`、`status = pending` で作成。
- 出力: `{ invite: {...}, inviteUrl: "/invites/<token>" }` / 201（**作成レスポンスのみ token を含む URL を返す**）。
- ログ: `invite.create`。

### POST /api/invites/[inviteId]/resend — 再送（owner）

- 認証 → Invite 存在（404）→ その Invite のボードで owner 判定（非メンバー 404 / owner 以外 403）。
- 状態（409）: `status !== pending`（accepted / revoked）。
- 処理: `token` を新しい値で**上書き**（旧 token 無効化）、`expiresAt = now + 7 日` に更新。
- 出力: `{ invite: {...}, inviteUrl }` / 200。ログ: `invite.resend`。

### POST /api/invites/[inviteId]/revoke — 失効（owner）

- 認証 → Invite 存在 → owner 判定。状態（409）: `status !== pending`。
- 処理: `status = revoked`。出力: `{ ok: true }` / 200。ログ: `invite.revoke`。

### GET /api/invites/token/[token] — 招待内容の確認（認証済み）

- 認証（401）→ token で Invite 検索（404）。
- 状態: 期限切れ（`now >= expiresAt`）または `revoked` は **410**。`accepted` は 409。
- 出力: `{ invite: { boardId, boardTitle, role, email, expiresAt } }` / 200（token は返さない）。

### POST /api/invites/token/[token]/accept — 承認（認証済み・email 一致）

判定順序（すべて満たした場合のみ承認）:

1. 認証必須 → 未認証 401。
2. token で Invite 検索 → 無ければ 404。
3. `status = revoked` または `now >= expiresAt` → **410**。
4. `status = accepted` → 409。
5. **招待の `email` とログインユーザーの `email` が不一致 → 403**（本人性確認。spec/012 で確定）。
6. ログインユーザーが既にそのボードのメンバー → 409（既存ロールは変更しない）。
7. 上記を通過したら、1 トランザクションで BoardMembership を作成（`role` は招待値）し、Invite を `accepted` に更新。

- 出力: `{ ok: true, boardId, role }` / 200。ログ: `invite.accept`。

## UI構造

- `/boards/[boardId]/members`（メンバー・招待管理。design/013 の一覧と同一画面）
  - 領域: 招待フォーム（email + role セレクト + 招待ボタン）／ 招待一覧（email・role・status・期限・再送/失効）／ 直近に発行した招待リンクの表示とコピー。
  - owner のみ操作可能。owner 以外は閲覧のみ（操作を表示しない）。
  - 招待 0 件は空状態表示。
- `/invites/[token]`（招待受け入れ）
  - 領域: ボード名・付与ロールの表示 ／ 「参加する」操作 ／ 状態別メッセージ（期限切れ・失効・使用済み・email 不一致）。
  - 未ログイン時はログイン/サインアップへ誘導し、認証後に同 URL へ戻る。
- 状態の所在: 招待一覧はサーバー取得、操作後は `router.refresh()`。招待リンクは作成/再送レスポンスをクライアント状態に保持して表示。
- 部品分類は design-system のトークンと shadcn component に従う。

## 状態遷移

- Invite: `pending` →（accept）→ `accepted` / →（revoke）→ `revoked` / →（時間経過）→ 期限切れ（`status` は `pending` のまま、有効判定で 410）。
- `accepted` / `revoked` からの遷移は不可（再送・失効・再承認は 409）。
- 再送は `pending` 内での token/expiresAt 更新（状態は変わらない）。
- UI: 招待作成 → リンク表示 → （相手が承認）→ 一覧が `accepted` に変化。

## 非機能の実装方針

### 性能

- 一覧は `where boardId`（`@@index([boardId])`）の単一クエリで取得する。承認は1つのトランザクションで行う。一覧の応答時間は200ms以内、書き込みの応答時間は300ms以内。

### セキュリティ

- token は CSPRNG 32 バイト、`@@unique`。一覧・確認レスポンスに token を含めない（作成/再送のみ URL として返す）。
- 承認は **email 一致必須**（不一致 403）。リンク流出時の第三者参加を防ぐ。
- 招待ロールは member / viewer のみ（owner 昇格は招待経由で行わせない）。
- 再送で旧 token を上書きし、流出した旧リンクを無効化できる。

### 運用

- 作成・再送・失効・承認（成功／失敗）を requestId 付きで操作ログに記録。
- **token をログに出力しない**（`inviteId` / `boardId` / `email` / 実行 userId のみ）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET /api/boards/[boardId]/invites | 認証 → Board存在 → owner | 401 / 404 / 403（非メンバーは404） |
| POST /api/boards/[boardId]/invites | 認証 → Board存在 → owner → 検証 → 衝突 | 401 / 404 / 403 / 422 / 409 |
| POST /api/invites/[inviteId]/resend | 認証 → Invite存在 → owner → 状態 | 401 / 404 / 403 / 409 |
| POST /api/invites/[inviteId]/revoke | 認証 → Invite存在 → owner → 状態 | 401 / 404 / 403 / 409 |
| GET /api/invites/token/[token] | 認証 → token存在 → 状態 | 401 / 404 / 410 / 409 |
| POST /api/invites/token/[token]/accept | 認証 → token存在 → 状態 → **email一致** → 既メンバー | 401 / 404 / 410 / 409 / 403 / 409 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| 招待作成 | info | requestId, invite.create, boardId, inviteId, email, role, actorUserId |
| 招待再送 | info | requestId, invite.resend, boardId, inviteId, actorUserId |
| 招待失効 | info | requestId, invite.revoke, boardId, inviteId, actorUserId |
| 招待承認 | info | requestId, invite.accept, boardId, inviteId, userId, role |
| 承認失敗 | warn | requestId, invite.accept_failed, inviteId, reason（expired / revoked / email_mismatch / already_member / already_accepted） |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- 「同一ボード・同一 email の pending は 1 件」は**アプリ層で検査**して 409（SQLite で部分ユニーク制約を張らない。DB 依存機能を固定判断に含めない）。
- 招待リンクは**相対パス** `/invites/<token>` を返し、オリジン付与は画面側で行う（spec/012 で確定）。
- 再送は新規レコードを作らず既存 Invite の token/expiresAt を上書きする（履歴保持は要件に無いため）。
- 承認は BoardMembership 作成と Invite 更新を**同一トランザクション**で行い、片方だけ成功する状態を作らない。
- 期限切れは `status` を書き換えず、判定時に `now >= expiresAt` で 410 とする（バッチ不要）。

## テスト方針

- Vitest。in-memory prisma mock に `invite` テーブルを追加（token 検索・boardId 検索・cascade）。
- ケース:
  - 作成: 201・`expiresAt` が 7 日後・`status=pending`／role=owner 422／role 不正 422／email 形式 422／pending 重複 409／既メンバー 409／owner 以外 403／未認証 401／board なし 404。
  - 一覧: `{ items }` 200・token を含まない・0 件・owner 以外 403。
  - 承認: 200 で BoardMembership 作成・role 一致・`accepted` 化／2 回目 409／token なし 404／期限切れ 410／revoked 410／**email 不一致 403**／既メンバー 409／未認証 401。
  - 再送: 200・新リンク・旧 token で 404・`expiresAt` 更新／accepted は 409／owner 以外 403。
  - 失効: 200・`revoked`・その token で承認 410。
  - cascade: ボード削除後、その token で承認すると 404。
  - token: 32 文字以上・2 回発行で不一致。

## 実装順序

1. design/011（User/Session）と design/013（BoardMembership / BoardRole）のモデル追加後に着手（依存）。
2. Prisma に Invite / InviteStatus を追加 ＋ migration。
3. `lib/repository/invite.ts`（作成・一覧・token 検索・再送・失効・承認）。
4. Route Handler（invites 一覧・作成・再送・失効・確認・承認）。
5. UI（メンバー管理画面の招待領域、`/invites/[token]` 受け入れ画面）。
6. テスト。

## 未決事項

- 招待メール送信は対象外（リンク共有方式）。将来メール導入時も email 一致必須は維持する。
- 招待の履歴保持（再送のたびに新レコードを残す）は要件に無いため行わない。将来要件で再検討。
