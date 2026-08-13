# API リファレンス: 認証・メンバー招待・権限管理

対象読者: 開発者
対象仕様: `spec/011_auth.md` / `spec/012_member_invite.md` / `spec/013_permissions.md`
対象設計: `design/011_auth.md` / `design/012_member_invite.md` / `design/013_permissions.md`
対象実装: `app/api/auth/**` / `app/api/boards/[boardId]/members/**` / `app/api/boards/[boardId]/invites/**` / `app/api/invites/**`
対象テスト: `tests/auth/auth.test.ts` / `tests/auth/axes.test.ts` / `tests/auth/units.test.ts`

## 概要

Simple Kanban の認証（サインアップ／ログイン／ログアウト／セッション確認）、ボードへのメンバー招待（作成／確認／承認／再送／失効）、権限管理（メンバー一覧／ロール変更／メンバー削除）の API を定義する。

- ロールは `owner` / `member` / `viewer` の 3 種類（`constitution.md § 権限ポリシー`）。強さは `owner > member > viewer`。
- 入口チェックの順序は「**認証 → 対象存在 → 権限 → 入力検証**」（`spec/000_shared_rules.md`）。
- セッションは HttpOnly Cookie（名前 `session`）で受け渡す。
- `POST /api/auth/signup` と `POST /api/auth/login` 以外のすべての API は認証が必要。

### 共通エラー形式

すべてのエラー応答は次の形をとる（`spec/000_shared_rules.md`）。

```json
{ "error": { "code": "<コード>", "message": "<日本語メッセージ>", "details": { "<field>": "<reason>" } } }
```

`details` は任意。

| ステータス | code | 用途 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 未認証（セッションなし・期限切れ） |
| 403 | `FORBIDDEN` | 認証済みだが権限不足 |
| 404 | `NOT_FOUND` | 対象が存在しない、または**非メンバー**（存在を漏らさない） |
| 409 | `CONFLICT` | 重複・状態衝突（email 重複、招待重複、承認済み、最後の owner） |
| 410 | `GONE` | 招待の有効期限切れ・失効 |
| 422 | `VALIDATION_ERROR` | 入力検証エラー |
| 500 | `INTERNAL_ERROR` | 予期しないサーバー側エラー |

### セッション Cookie

| 項目 | 値 |
|---|---|
| 名前 | `session` |
| 属性 | `HttpOnly` / `SameSite=Lax` / `Path=/` |
| `Secure` | `NODE_ENV === "production"` のときのみ付与 |
| 有効期限 | 発行から 7 日（`Session.expiresAt` と `Max-Age` が一致） |
| 失効 | ログアウト時に同名 Cookie を `Max-Age=0` |

実装: `lib/auth/session.ts`

---

# 1. 認証 API

## 1-1. POST /api/auth/signup

アカウントを作成し、同時にログイン状態にする。

- **メソッド / パス**: `POST /api/auth/signup`
- **権限**: 不要（未認証で実行）

### 入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `email` | string | ✅ | `^[^\s@]+@[^\s@]+\.[^\s@]+$`（教材用の簡易判定） |
| `password` | string | ✅ | 8〜200 文字。英字（a-zA-Z）、数字（0-9）、記号をそれぞれ 1 文字以上 |
| `name` | string | ✅ | 1〜50 文字（前後の空白を除去して判定） |

```json
{ "email": "user@example.com", "password": "Password1!", "name": "Aoi Tanaka" }
```

> パスワード条件は教材用の簡略仕様であり、実運用の認証方針を示すものではない（`spec/011_auth.md`）。

### 出力（201）

```json
{ "user": { "id": "clx...", "email": "user@example.com", "name": "Aoi Tanaka" } }
```

`Set-Cookie: session=...; HttpOnly; SameSite=Lax; Path=/` が付与される。
**`passwordHash` および平文パスワードはレスポンスに含まれない。**

### ステータスコード

| コード | 条件 |
|---|---|
| 201 | 作成成功 |
| 409 `CONFLICT` | `email` が既に登録済み |
| 422 `VALIDATION_ERROR` | `email` 形式不正 / `password` 長さ・文字種違反 / `name` 長さ違反 |
| 500 `INTERNAL_ERROR` | 予期しないエラー |

### 関連テスト

- `tests/auth/auth.test.ts` — 201 と user 返却、`passwordHash` 非包含、email 重複 409、形式不正 422、password 7 文字/文字種不足 422
- `tests/auth/axes.test.ts` — name 1/50 文字成功、name 0/51 文字 422、password 200 成功 / 201 → 422
- `tests/auth/units.test.ts` — `isValidEmail` / `isValidPassword` / `isValidName` の境界

---

## 1-2. POST /api/auth/login

- **メソッド / パス**: `POST /api/auth/login`
- **権限**: 不要（未認証で実行）

### 入力

| フィールド | 型 | 必須 |
|---|---|---|
| `email` | string | ✅ |
| `password` | string | ✅ |

### 出力（200）

```json
{ "user": { "id": "clx...", "email": "user@example.com", "name": "Aoi Tanaka" } }
```

セッション Cookie が発行される。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 認証成功 |
| 401 `UNAUTHORIZED` | メールアドレスが存在しない **または** パスワード不一致 |
| 422 `VALIDATION_ERROR` | `email` / `password` が文字列でない（⚠️ 警告 3 参照） |
| 500 `INTERNAL_ERROR` | 予期しないエラー |

> **認証失敗は理由を区別しない**: 「メールアドレス不存在」と「パスワード不一致」は、ステータス（401）・`error.code`（`UNAUTHORIZED`）・`error.message` のすべてが同一の応答を返す。失敗理由はサーバーログにのみ `auth.login_failed`（`reason: no_user | bad_password`）として記録される。

### 関連テスト

- `tests/auth/auth.test.ts` — 200 成功、不存在 401、誤パスワード 401、**両応答の完全一致**（`toEqual`）
- `tests/auth/units.test.ts` — `verifyPassword` の誤パスワード false、壊れた保存値でも例外を投げない

---

## 1-3. POST /api/auth/logout

- **メソッド / パス**: `POST /api/auth/logout`
- **権限**: 認証済み
- **入力**: なし

### 出力（200）

```json
{ "ok": true }
```

セッション Cookie が `Max-Age=0` で失効する。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | ログアウト成功 |
| 401 `UNAUTHORIZED` | 未認証 |

> **破棄されるのは現在のセッションのみ**。同一ユーザーの他デバイス／他セッションは有効なまま（`lib/auth/session.ts` の `destroySession` は Cookie の token に一致する 1 件のみ削除）。

### 関連テスト

- `tests/auth/auth.test.ts` — ログアウト 200 と以後の session 401

---

## 1-4. GET /api/auth/session

現在ログイン中のユーザーを返す。

- **メソッド / パス**: `GET /api/auth/session`
- **権限**: 認証済み
- **入力**: なし（Cookie で判定）

### 出力（200）

```json
{ "user": { "id": "clx...", "email": "user@example.com", "name": "Aoi Tanaka" } }
```

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 有効なセッションあり |
| 401 `UNAUTHORIZED` | Cookie なし / トークン不正 / **有効期限切れ**（`now >= expiresAt`。期限切れセッションは参照時に削除される） |

### 関連テスト

- `tests/auth/auth.test.ts` — サインアップ後 200、ログアウト後 401

---

# 2. メンバー招待 API

招待の有効期限は発行から **7 日**。トークンは CSPRNG で 32 バイト生成し URL-safe エンコードした値（`lib/auth/token.ts`）。

## 2-1. GET /api/boards/[boardId]/invites

- **メソッド / パス**: `GET /api/boards/[boardId]/invites`
- **権限**: **owner**
- **入力**: パスパラメータ `boardId`

### 出力（200）

```json
{ "items": [
  { "id": "clx...", "email": "guest@example.com", "role": "member",
    "status": "pending", "expiresAt": "2026-07-28T00:00:00.000Z", "createdAt": "2026-07-21T00:00:00.000Z" }
] }
```

**`token` は一覧に含まれない**（招待リンクを知る者が承認できるため）。招待が 0 件のときは `{ "items": [] }`。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 取得成功 |
| 401 `UNAUTHORIZED` | 未認証 |
| 403 `FORBIDDEN` | メンバーだが owner でない |
| 404 `NOT_FOUND` | ボードが存在しない、または**非メンバー** |

### 関連テスト

- `tests/auth/auth.test.ts` — 200 と token 非包含、owner 以外 403
- `tests/auth/axes.test.ts` — 0 件で空配列

---

## 2-2. POST /api/boards/[boardId]/invites

- **メソッド / パス**: `POST /api/boards/[boardId]/invites`
- **権限**: **owner**

### 入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `email` | string | ✅ | メールアドレス形式（`spec/011` と同一の簡易判定） |
| `role` | string | ✅ | **`member` または `viewer` のみ**（`owner` は不可） |

### 出力（201）

```json
{
  "invite": { "id": "clx...", "email": "guest@example.com", "role": "member",
              "status": "pending", "expiresAt": "2026-07-28T00:00:00.000Z" },
  "inviteUrl": "/invites/<token>"
}
```

`inviteUrl` は**相対パス**。オリジンは画面側で付与する。**作成・再送のレスポンスのみ**トークンを含む URL を返す。

### ステータスコード

| コード | 条件 |
|---|---|
| 201 | 作成成功 |
| 401 `UNAUTHORIZED` | 未認証 |
| 403 `FORBIDDEN` | メンバーだが owner でない |
| 404 `NOT_FOUND` | ボードが存在しない、または非メンバー |
| 409 `CONFLICT` | 同一ボード・同一 `email` の `pending` 招待が既に存在 / その `email` のユーザーが既にメンバー |
| 422 `VALIDATION_ERROR` | `email` 形式不正 / `role` が member・viewer 以外（`owner` 指定を含む） |

### 関連テスト

- `tests/auth/auth.test.ts` — 201・7 日後期限・`pending`・token 32 文字以上かつ毎回異なる、role=owner 422、email 不正 422、pending 重複 409、既メンバー 409、owner 以外 403
- `tests/auth/axes.test.ts` — 存在しないボード 404、未認証 401

---

## 2-3. GET /api/invites/token/[token]

招待リンクの内容（ボード名・ロール）を確認する。

- **メソッド / パス**: `GET /api/invites/token/[token]`
- **権限**: 認証済み

### 出力（200）

```json
{ "invite": { "boardId": "clx...", "boardTitle": "Sprint 1", "role": "viewer",
              "email": "guest@example.com", "expiresAt": "2026-07-28T00:00:00.000Z" } }
```

レスポンスに `token` は含まれない。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 有効な招待 |
| 401 `UNAUTHORIZED` | 未認証 |
| 404 `NOT_FOUND` | トークンに対応する招待がない（再送で無効化された旧トークンを含む） |
| 409 `CONFLICT` | 招待が承認済み（⚠️ 警告 4 参照） |
| 410 `GONE` | 有効期限切れ または 失効（`revoked`） |

### 関連テスト

- `tests/auth/axes.test.ts` — 200 で boardTitle / role 返却・token 非包含、期限切れ 410、失効 410、未認証 401

---

## 2-4. POST /api/invites/token/[token]/accept

招待を承認し、ボードのメンバーになる。

- **メソッド / パス**: `POST /api/invites/token/[token]/accept`
- **権限**: 認証済み **かつ 招待の `email` とログイン中ユーザーの `email` が一致**
- **入力**: パスパラメータ `token`（ボディ不要）

### 出力（200）

```json
{ "ok": true, "boardId": "clx...", "role": "member" }
```

`BoardMembership` の作成と招待の `accepted` 化は**同一トランザクション**で実行される。

### 判定順序とステータスコード

実装は次の順で判定する（`app/api/invites/token/[token]/accept/route.ts`）。

| 順 | 条件 | コード |
|---|---|---|
| 1 | 未認証 | 401 `UNAUTHORIZED` |
| 2 | トークンに対応する招待がない | 404 `NOT_FOUND` |
| 3 | 失効（`revoked`）または有効期限切れ | 410 `GONE` |
| 4 | 招待が承認済み（`accepted`） | 409 `CONFLICT` |
| 5 | **招待の `email` とログインユーザーの `email` が不一致** | 403 `FORBIDDEN` |
| 6 | ログインユーザーが既にそのボードのメンバー | 409 `CONFLICT`（**既存ロールは変更しない**） |
| 7 | 上記をすべて通過 | 200 |

> **本人性の確認**: 招待リンクが流出しても、招待先メールアドレス以外のアカウントでは参加できない（403）。

### 関連テスト

- `tests/auth/auth.test.ts` — 200 で BoardMembership 作成・role 一致・`accepted` 化、2 回目 409、**email 不一致 403（メンバーにならない）**、期限切れ 410、失効 410、存在しない token 404、未認証 401
- `tests/auth/axes.test.ts` — 期限切れでメンバー数が増えない、期限 1 秒前は承認可、状態遷移 pending → accepted

---

## 2-5. POST /api/invites/[inviteId]/resend

トークンを再発行し、有効期限を更新する。

- **メソッド / パス**: `POST /api/invites/[inviteId]/resend`
- **権限**: **owner**（対象招待のボード）
- **入力**: パスパラメータ `inviteId`（ボディ不要）

### 出力（200）

```json
{ "invite": { "id": "clx...", "email": "guest@example.com", "role": "member",
              "status": "pending", "expiresAt": "2026-07-28T00:00:00.000Z" },
  "inviteUrl": "/invites/<新しい token>" }
```

**旧トークンは上書きされ無効になる**（旧リンクでの承認は 404）。`expiresAt` は再送時刻の 7 日後に更新。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 再送成功 |
| 401 `UNAUTHORIZED` | 未認証 |
| 403 `FORBIDDEN` | メンバーだが owner でない |
| 404 `NOT_FOUND` | 招待が存在しない、または非メンバー |
| 409 `CONFLICT` | 招待が `pending` でない（`accepted` / `revoked`） |

### 関連テスト

- `tests/auth/auth.test.ts` — 200・新リンク・旧 token 404・`expiresAt` 更新
- `tests/auth/axes.test.ts` — owner 以外 403、accepted は 409、存在しない招待 404、状態遷移（旧 token 404 → 新 token 200）

---

## 2-6. POST /api/invites/[inviteId]/revoke

- **メソッド / パス**: `POST /api/invites/[inviteId]/revoke`
- **権限**: **owner**（対象招待のボード）

### 出力（200）

```json
{ "ok": true }
```

招待の `status` が `revoked` になり、そのトークンでの承認は 410 になる。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 失効成功 |
| 401 / 403 / 404 | 再送と同じ |
| 409 `CONFLICT` | 招待が `pending` でない |

### 関連テスト

- `tests/auth/auth.test.ts` — 200・`revoked` 化・以後の承認 410
- `tests/auth/axes.test.ts` — owner 以外 403、accepted は 409、状態遷移 pending → revoked

---

# 3. 権限管理 API

## 3-1. GET /api/boards/[boardId]/members

- **メソッド / パス**: `GET /api/boards/[boardId]/members`
- **権限**: **viewer 以上**

### 出力（200）

```json
{ "items": [
  { "userId": "clx...", "name": "Aoi Tanaka", "email": "aoi@example.com", "role": "owner" }
] }
```

**`passwordHash` は含まれない**（`select` で `id` / `name` / `email` のみ取得）。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 取得成功 |
| 401 `UNAUTHORIZED` | 未認証 |
| 404 `NOT_FOUND` | ボードが存在しない、または**非メンバー** |

### 関連テスト

- `tests/auth/auth.test.ts` — 200・件数・`passwordHash` 非包含
- `tests/auth/axes.test.ts` — 非メンバー 404、未認証 401、メンバー 1 人のとき 1 件

---

## 3-2. PATCH /api/boards/[boardId]/members/[userId]

メンバーのロールを変更する。

- **メソッド / パス**: `PATCH /api/boards/[boardId]/members/[userId]`
- **権限**: **owner**

### 入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `role` | string | ✅ | `owner` / `member` / `viewer` のいずれか |

### 出力（200）

```json
{ "userId": "clx...", "role": "viewer" }
```

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 変更成功 |
| 401 `UNAUTHORIZED` | 未認証 |
| 403 `FORBIDDEN` | メンバーだが owner でない |
| 404 `NOT_FOUND` | ボードが存在しない / 非メンバー / 対象メンバーが存在しない |
| 409 `CONFLICT` | **最後の owner を owner 以外へ降格しようとした**（ロールは変更されない） |
| 422 `VALIDATION_ERROR` | `role` が 3 種以外、または未指定 |

> **最後の owner 保護**: 対象が `owner` かつそのボードの owner 数が 1 のとき、降格は 409 で拒否される。自分自身の降格にも同じ判定が適用される。owner が 2 人以上いれば降格できる。

### 関連テスト

- `tests/auth/auth.test.ts` — owner による 200、member による 403、最後の owner 降格 409（ロール不変）、owner 2 人なら成功、role 不正 422、対象なし 404
- `tests/auth/axes.test.ts` — member/viewer への降格が両方 409、role 欠落 422、存在しないボード 404、状態遷移 member → owner → member（昇格後は owner 操作可、降格後は 403）

---

## 3-3. DELETE /api/boards/[boardId]/members/[userId]

メンバーをボードから削除する。

- **メソッド / パス**: `DELETE /api/boards/[boardId]/members/[userId]`
- **権限**: **owner**
- **入力**: パスパラメータ `boardId` / `userId`

### 出力（200）

```json
{ "ok": true }
```

削除されたユーザーは、以後そのボードの参照が 404 になる。

### ステータスコード

| コード | 条件 |
|---|---|
| 200 | 削除成功 |
| 401 `UNAUTHORIZED` | 未認証 |
| 403 `FORBIDDEN` | メンバーだが owner でない（**member / viewer による自主退出も 403**） |
| 404 `NOT_FOUND` | ボードが存在しない / 非メンバー / 対象メンバーが存在しない |
| 409 `CONFLICT` | 最後の owner を削除しようとした |

> メンバー自身による退出機能は提供していない（`spec/013_permissions.md`）。

### 関連テスト

- `tests/auth/auth.test.ts` — 最後の owner 削除 409
- `tests/auth/axes.test.ts` — member の自分自身削除 403、owner 2 人なら削除成功、対象なし 404、状態遷移（削除後にボード参照が 200 → 404）

---

# 4. 既存 API への権限適用

認証実装に伴い、`POST /api/auth/signup` と `POST /api/auth/login` を除く**すべての API** が認証を必要とする（`design/013_permissions.md § 既存設計との差分`）。

| API | 必要ロール |
|---|---|
| `GET /api/boards` | 認証済み（**メンバーであるボードのみ**を返す） |
| `POST /api/boards` | 認証済み（ロール不問。**作成者が owner になる**） |
| `GET /api/boards/[boardId]` | viewer 以上 |
| `PATCH` / `DELETE /api/boards/[boardId]` | owner |
| リスト・カード・ラベル・検索の取得系 | viewer 以上 |
| リスト・カード・ラベルの作成／編集／移動／削除／アーカイブ／復元 | member 以上 |
| `DELETE /api/cards/[cardId]/purge` | owner |

- **非メンバーには 404** を返し、ボードの存在を漏らさない。メンバーだが権限が足りない場合のみ 403。
- ボード削除時は配下のリスト・カード・ラベルに加えて **BoardMembership と Invite も削除**される。

判定は `lib/auth/permissions.ts` の `checkBoardAccess` / `checkListAccess` / `checkCardAccess` に集約されている。

### 関連テスト

- `tests/auth/auth.test.ts` — ボード作成で owner 付与、一覧はメンバー分のみ、非メンバー 404、未認証 401、viewer の書き込み 403
- `tests/auth/axes.test.ts` — member のボード編集・削除・purge 403、viewer のカード作成・移動 403、非メンバーのリスト・カード参照 404
- `tests/api/kanban.test.ts` — 既存のボード・リスト・カード機能の回帰（認証前提へ更新済み）

---

# ⚠️ 警告: 仕様・設計・実装・テストの間の不一致

以下は `review/011_013_auth_invite_permissions_review.md` で検出された不一致で、**本ドキュメントでは断定的な仕様として記載していない**。修正方針は未確定。

### 警告 1 [Important] 招待リンクからのログイン後、承認画面に戻らない

- `spec/012_member_invite.md § 画面` は「未ログインの場合はログイン（またはサインアップ）へ誘導し、**認証後に承認へ戻る**」と規定している。
- 実装（`app/invites/[token]/page.tsx`）は `/login` `/signup` へのリンクを表示するのみで戻り先を保持せず、ログイン成功後はボード一覧へ遷移する。
- **API の挙動には影響しない**（画面導線のみ）。利用者はログイン後に招待リンクを開き直す必要がある。

### 警告 2 [Important] 設計が定めた `requireUser()` が実装されていない

- `design/011_auth.md § 共通部品 / 実装方針` は認証必須判定を `requireUser()` に集約すると固定している。
- 実装には `requireUser` が存在せず、`getSessionUser()` + `unauthorized()` が 7 箇所に重複している。
- **応答は仕様どおり（401）で API の振る舞いに差はない**。構造上の逸脱のみ。

### 警告 3 [Polish] ログイン API の入力型不正が 422 を返す

- `spec/011_auth.md § 異常系` はログインについて「認証失敗は 401（理由を区別しない）」のみ規定し、422 の記載がない。
- 実装は `email` / `password` が文字列でない場合に 422 を返す（本文書 1-2 に記載済み）。
- 401 に統一するか、仕様に 422 を追記するかは未確定。

### 警告 4 [Polish] 招待確認 API の 409 と `status` の扱い

- 実装・`design/012` は承認済み招待の確認に 409 を返すが、`spec/012 § 権限境界` の表には 409 の記載がない。
- `spec/012 § API` の用途には「ボード名・ロール・**状態**」とあるが、実装のレスポンスに `status` は含まれない。
- 本文書は**実装の挙動**（409 を返す／`status` を返さない）を記載している。

---

## 関連ファイル

| 種別 | パス |
|---|---|
| 仕様 | `spec/011_auth.md` / `spec/012_member_invite.md` / `spec/013_permissions.md` / `spec/000_shared_rules.md` |
| 設計 | `design/011_auth.md` / `design/012_member_invite.md` / `design/013_permissions.md` |
| 共通処理 | `lib/auth/{password,token,session,permissions}.ts` / `lib/validation/auth.ts` / `lib/errors.ts` |
| 永続化 | `lib/repository/{board,member,invite}.ts` / `prisma/schema.prisma` |
| テスト | `tests/auth/{auth,axes,units}.test.ts` / `tests/helpers/db.ts` |
| レビュー | `review/011_013_auth_invite_permissions_review.md` |
