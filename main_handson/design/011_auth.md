# 認証の設計

## 関連仕様

- spec/011_auth.md / spec/000_shared_rules.md / constitution.md
- spec/012_member_invite.md / spec/013_permissions.md（連携先）

## 前提

- design/001-009 の前提（技術スタック・共通規則）を継承する。
- 既存設計が「認証は後続機能で確定」としていた実体を、本設計で確定する。
- **User / Session を新規追加する（未実装のため要 migration）**。
- パスワードハッシュは **Node 標準 `node:crypto` の scrypt** を採用（新規依存なし）。

## 既存設計との差分

- design/001-009 は「認証・ロール解決は未接続、コア段階は通過」を前提としていた。本設計以降、**全 API で認証・権限チェックを実接続する**（`spec/013_permissions.md`）。各 Route Handler の入口に認証と権限判定を挿入する（詳細は design/013）。
- 既存の開発用固定ユーザーに相当する仕組みは持たず、セッション Cookie から実ユーザーを解決する。

## データモデル

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions    Session[]
  memberships BoardMembership[]   // design/013
  invitesSent Invite[]            // design/012（invitedByUserId）
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- `email` は一意（重複サインアップは 409）。
- `token` は一意。セッション検索は `token` の完全一致 1 件。
- User 削除時に Session は cascade 削除（本仕様に User 削除操作は無いが整合のため設定）。

## API設計

入口チェック順序は「認証 → 対象存在 → 権限 → 入力検証」（spec/000）。認証系は対象存在・権限が無いため「入力検証 → 資格確認」の順で行う。

### POST /api/auth/signup

- 入力: `{ email, password, name }`。
- 検証（422）: email 形式（`^[^\s@]+@[^\s@]+\.[^\s@]+$`）／password 8〜72 かつ英字1以上・数字1以上／name 1〜50（trim 後）。
- 重複（409）: 同一 email の User が存在。
- 処理: `hashPassword(password)` → User 作成 → セッション発行 → Set-Cookie。
- 出力: `{ user: { id, email, name } }` / **201**。`passwordHash` は含めない。
- ログ: `auth.signup`（成功）。

### POST /api/auth/login

- 入力: `{ email, password }`。
- 処理: User を email で検索 → `verifyPassword` で照合。**不一致・不存在のいずれも同一の 401 応答**（`UNAUTHORIZED` / 同一メッセージ）。
- 成功時: セッション発行 → Set-Cookie。
- 出力: `{ user: { id, email, name } }` / 200。
- ログ: `auth.login`（成功）/ `auth.login_failed`（失敗。内部理由 `reason: no_user | bad_password` はログのみ、応答には出さない）。

### POST /api/auth/logout

- 認証必須（未認証は 401）。
- 処理: 現在のセッション（Cookie の token）を **1 件だけ削除**。他セッションは残す。Cookie を `Max-Age=0` で失効。
- 出力: `{ ok: true }` / 200。ログ: `auth.logout`。

### GET /api/auth/session

- 処理: Cookie の token でセッションを検索し、`now < expiresAt` なら User を返す。
- 出力: `{ user: { id, email, name } }` / 200。無効・期限切れ・Cookie なしは 401 / UNAUTHORIZED。
- 期限切れセッションは検出時に削除する（遅延クリーンアップ）。

### セッション Cookie（spec/011 で確定済み）

| 項目 | 値 |
|---|---|
| 名前 | `session` |
| 属性 | `HttpOnly` / `SameSite=Lax` / `Path=/` |
| `Secure` | `process.env.NODE_ENV === "production"` のとき付与 |
| 有効期限 | 発行から 7 日（`Max-Age` と `Session.expiresAt` を一致させる） |
| 失効 | ログアウト時に同名 Cookie を `Max-Age=0` |

## 共通部品（lib）

- `lib/auth/password.ts`
  - `hashPassword(plain: string): string` — `randomBytes(16)` のソルト＋`scryptSync(plain, salt, 64)`。保存形式 `scrypt$<salt_hex>$<hash_hex>`。
  - `verifyPassword(plain: string, stored: string): boolean` — 保存値からソルトを取り出して再計算し、**`timingSafeEqual` で比較**（長さ不一致は false）。
- `lib/auth/token.ts`
  - `generateToken(): string` — `randomBytes(32).toString("base64url")`（CSPRNG・32 バイト・URL-safe。長さは 43 文字で 32 文字以上を満たす）。招待（design/012）と共用。
- `lib/auth/session.ts`
  - `createSession(userId)` / `getSessionUser()`（Cookie から解決、期限切れは null＋削除）/ `destroySession()`。
  - `requireUser()` — 未認証なら 401 応答を返すためのヘルパ（Route Handler が早期 return）。
- `lib/validation/auth.ts`
  - `validateEmail` / `validatePassword` / `validateName`（純粋関数。単体テスト対象）。

## UI構造

- `/signup`・`/login`（**AppShell を使わず**、全画面中央のカードパネル。design-system の認証系ルールに従う）
  - 領域: ブランド表示 ／ 入力フォーム（name/email/password、login は email/password）／ エラー表示 ／ 反対側への導線リンク。
  - 状態の所在: 入力値・送信中・エラーはフォームのクライアント状態。成功でボード一覧へ遷移。
- ログアウト: AppShell の user footer ドロップダウンから実行し `/login` へ遷移。
- 未認証で保護 page にアクセスした場合は `/login` へリダイレクトする。
- 部品分類・色・角丸は design-system のトークンと shadcn component に従う。

## 状態遷移

- Session: 未発行 → 発行（signup / login）→ 破棄（logout）または 期限切れ（`now >= expiresAt`）→ 無効。
- UI: 未認証 →（login/signup 成功）→ 認証済み →（logout）→ 未認証。

## 非機能の実装方針

### 性能

- セッション確認は `token` の一意インデックスで 1 クエリ。P95 200ms 以内。認証系書き込みは P95 300ms 以内。
- scrypt はコスト関数のため CPU を使う。既定パラメータ（N=16384 相当のデフォルト）で教材用途に十分な範囲に留める。

### セキュリティ

- パスワードは平文保存・平文ログ出力をしない。応答に `passwordHash` を含めない。
- ログイン失敗はステータス・code・message を同一にして理由を漏らさない。
- セッション／招待トークンは CSPRNG 32 バイト。
- Cookie は HttpOnly / SameSite=Lax / 本番 Secure。
- パスワード照合は `timingSafeEqual`。
- レート制限は spec で対象外と確定（実装しない）。

### 運用

- サインアップ・ログイン成功／失敗・ログアウトを requestId 付きで操作ログに記録（`lib/audit/log`）。
- **パスワード平文・`passwordHash`・セッショントークンをログに出力しない**（ログ関数へ渡さない）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| POST /api/auth/signup | 認証不要 → 入力検証 → email 重複 | 422 / 409 |
| POST /api/auth/login | 認証不要 → 入力検証 → 資格照合 | 422 / 401（理由を区別しない） |
| POST /api/auth/logout | 認証必須 | 401 |
| GET /api/auth/session | 認証必須（期限内） | 401 |
| 他機能の保護 API | `requireUser()` → 対象存在 → 権限（design/013） | 401 / 404 / 403 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| サインアップ成功 | info | requestId, auth.signup, userId |
| ログイン成功 | info | requestId, auth.login, userId |
| ログイン失敗 | warn | requestId, auth.login_failed, email, reason（内部のみ） |
| ログアウト | info | requestId, auth.logout, userId |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- **ハッシュは `node:crypto` の scrypt**（ソルト 16 バイト、鍵長 64 バイト、保存形式 `scrypt$<salt>$<hash>`）に固定。bcryptjs も候補だが、新規依存を増やさず Node 標準で要件（ソルト付き・timing safe 比較）を満たせるため採用しない。
- セッションは **DB 保存のランダムトークン方式**（Cookie にトークンのみ格納）。JWT は署名鍵管理と失効の複雑さを避けるため採用しない。
- 認証必須の判定は `requireUser()` に集約し、各 Route Handler では早期 return のみ書く（重複実装を避ける）。
- 期限切れセッションは参照時に削除する遅延方式（定期ジョブは持たない）。

## テスト方針

- Vitest。既存 `tests/api/kanban.test.ts` の in-memory prisma mock を拡張（`user` / `session` テーブル、`@@unique` 相当の検索）。
- 純粋関数（`lib/auth/password.ts` / `lib/validation/auth.ts`）は DB 不要の単体テスト。
- ケース:
  - password: ハッシュが平文と異なる／同一パスワードでも 2 回のハッシュが異なる（ソルト）／`verifyPassword` が正誤を判定。
  - token: 長さ 32 文字以上／2 回発行で不一致。
  - validation: email 形式（`a@b`→不正 / `a@b.co`→妥当）、password 7/8/72/73・英字のみ・数字のみ、name 0/1/50/51。
  - API: signup 201・重複 409・422 各種／login 200・不存在 401・誤パスワード 401・**両者の応答が同一**／logout 200 と以後 401・他セッションは有効／session 200 / 401 / 期限切れ 401。
  - Cookie: Set-Cookie に HttpOnly・SameSite=Lax・Path=/ が含まれる。

## 実装順序

1. Prisma に User / Session を追加 ＋ migration。理由: 全機能が依存。
2. 共通部品（`password.ts` / `token.ts` / `session.ts` / `validation/auth.ts`）。理由: API が依存。
3. 認証 API（signup / login / logout / session）。
4. 認証画面（`/login` / `/signup`）と未認証リダイレクト、AppShell のログアウト接続。
5. 既存 API への `requireUser()` 適用（design/013 と連動）。
6. テスト。

## 未決事項

- パスワード変更・リセット、メール確認は本仕様の対象外（将来要件）。
- セッションのスライディング延長は行わない（spec で確定）。
