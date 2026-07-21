# 認証・メンバー招待・権限管理 レビューレポート

レビュー日時: 2026-07-21
対象仕様: spec/011_auth.md / spec/012_member_invite.md / spec/013_permissions.md
対象設計: design/011_auth.md / design/012_member_invite.md / design/013_permissions.md
対象実装:
- lib: `lib/auth/{password,token,session,permissions}.ts` / `lib/validation/auth.ts` / `lib/errors.ts` / `lib/repository/{board,member,invite}.ts`
- API: `app/api/auth/**` / `app/api/boards/[boardId]/members/**` / `app/api/boards/[boardId]/invites/**` / `app/api/invites/**` / 既存 API 16 ルート
- 画面: `app/login/**` / `app/signup/**` / `app/boards/[boardId]/members/**` / `app/invites/[token]/**` / `components/layout/AppShell.tsx`
- スキーマ: `prisma/schema.prisma`

## サマリー

| 観点 | Critical | Important | Polish |
|---|---|---|---|
| 1. 仕様カバレッジ | 0 | 1 | 1 |
| 2. 実装カバレッジ | 0 | 0 | 2 |
| 3. 振る舞い（ステータスコード含む） | 0 | 0 | 2 |
| 4. 権限境界 | 0 | 0 | 0 |
| 5. 用語 | 0 | 0 | 0 |
| 6. デザイントークン | 0 | 0 | 0 |
| 7. コンポーネント一貫 | 0 | 0 | 0 |
| 8. 共通レイアウト | 0 | 0 | 0 |
| 9. 設計準拠（構造） | 0 | 1 | 0 |

**Critical 0 件。** セキュリティの中核（認証必須化・権限境界・招待の本人性・最後の owner 保護・ハッシュ・トークン強度）は仕様どおり実装されている。Important 2 件は機能差 1・構造逸脱 1。

---

## 観点1: 仕様カバレッジ（仕様にあるが実装にない）

### I1 [Important] 招待リンクからログインしても、承認画面に戻らない

- 観点: 仕様カバレッジ
- 対象ファイル: `app/invites/[token]/page.tsx`（未ログイン分岐）/ `app/login/_components/LoginForm.tsx` / `app/signup/_components/SignupForm.tsx`
- 問題の理由: spec/012 § 画面 は「未ログインの場合はログイン（またはサインアップ）へ誘導し、**認証後に承認へ戻る**」と規定している。実装は `/login` `/signup` へのリンクを出すだけで戻り先を保持せず、ログイン成功後は `router.push("/")` でボード一覧へ遷移する。招待された利用者はログイン後に自力で招待リンクを開き直す必要があり、仕様の導線が成立しない（招待フローの完走性に影響）。
- 修正案: 招待画面のリンクを `/login?redirect=/invites/<token>`（および signup 同様）とし、`LoginForm` / `SignupForm` が `searchParams` の `redirect` を安全に検証（自サイト内の相対パスのみ許可）して遷移先に使う。オープンリダイレクト防止のため、`/` 始まりかつ `//` を含まない値のみ採用する。
- 確認が必要な判断点: `redirect` パラメータ方式で実装してよいか（オープンリダイレクト対策として相対パス限定を必須とする）。あるいは仕様側を「ログイン後は手動で招待リンクを開き直す」に緩めるか。

### P1 [Polish] 招待内容の確認 API が `status` を返さない

- 観点: 仕様カバレッジ
- 対象ファイル: `app/api/invites/token/[token]/route.ts`
- 問題の理由: spec/012 § API の用途に「招待内容の確認（ボード名・ロール・**状態**）」とあるが、レスポンスは `boardId` / `boardTitle` / `role` / `email` / `expiresAt` で `status` を含まない。実運用上は有効な招待（pending）のみ 200 を返す設計なので実害は小さいが、仕様の記述と応答が一致しない。
- 修正案: レスポンスに `status` を追加するか、spec/012 の API 用途から「状態」を削る（有効時のみ 200 を返すため status は常に pending である旨を注記）。
- 確認が必要な判断点: 実装に合わせて仕様を直すか、仕様に合わせて `status` を追加するか。

## 観点2: 実装カバレッジ（実装にあるが仕様にない）

### P2 [Polish] `lib/mockMeta.ts` の `CURRENT_USER` が未使用のまま残っている

- 観点: 実装カバレッジ
- 対象ファイル: `lib/mockMeta.ts`
- 問題の理由: design-system 工程で導入したデモ用の固定ユーザー。認証実装により全画面が実ユーザー（`getSessionUser` / `access.user`）を使うようになり、参照が 0 件になった。残置するとデモ用ユーザーが現役だと誤読される。
- 修正案: `CURRENT_USER` を削除する。同ファイルの `MOCK_MEMBERS` / `boardStats` / `listStatus` はボードカードの統計・リスト状態ドットで引き続き使用中のため残す。
- 確認が必要な判断点: なし（削除して問題ないか一次確認のみ）。

### P3 [Polish] ログイン API の入力型不正が 422 を返す（仕様は 401 のみ規定）

- 観点: 実装カバレッジ / 振る舞い
- 対象ファイル: `app/api/auth/login/route.ts`
- 問題の理由: `email` / `password` が文字列でない場合に 422 を返す。spec/011 § 異常系はログインについて「認証失敗は 401（理由を区別しない）」のみ規定しており、422 は仕様に記述がない。攻撃者が「型が不正か否か」を 422/401 の差で判別できる（情報量は極めて小さいが、失敗理由を区別しない方針とは方向が異なる）。
- 修正案: 型不正も 401 に寄せて失敗応答を完全に一本化する。または spec/011 § 異常系に「入力型不正は 422」を追記して仕様を実装に合わせる。
- 確認が必要な判断点: 401 に統一（安全側・推奨）か、仕様へ 422 を明記するか。

## 観点3: 振る舞いの整合（ステータスコード・レスポンス）

**整合（不一致なし）**: 主要なステータスコードは仕様どおり。

| 操作 | 仕様 | 実装 | 判定 |
|---|---|---|---|
| signup 成功 / email 重複 / 入力不備 | 201 / 409 / 422 | 201 / `conflict()` 409 / `validationError()` 422 | ✅ |
| login 成功 / 失敗（不存在・誤パスワード） | 200 / 401（同一応答） | 200 / `unauthorized()` 401（status・code・message 同一、テストで `toEqual` 検証） | ✅ |
| logout / session | 200 / 401 | 200 / 401 | ✅ |
| 招待作成 / 重複・既メンバー / role=owner | 201 / 409 / 422 | 201 / 409 / 422 | ✅ |
| 招待承認: 期限切れ・失効 / 承認済み・既メンバー / email 不一致 | 410 / 409 / 403 | `gone()` 410 / `conflict()` 409 / `forbidden()` 403 | ✅ |
| 再送・失効: accepted / 不存在 | 409 / 404 | 409 / 404 | ✅ |
| ロール変更: 最後の owner / role 不正 / 対象なし | 409 / 422 / 404 | 409 / 422 / 404 | ✅ |
| 非メンバー / 権限不足 | 404 / 403 | `AccessResult` で `not_found` / `forbidden` を型分離 | ✅ |

### P4 [Polish] spec/012 の権限境界表に「招待内容の確認 → 409」が記載されていない

- 観点: 振る舞いの整合（仕様内の記載差）
- 対象ファイル: spec/012_member_invite.md § 権限境界 / `app/api/invites/token/[token]/route.ts`
- 問題の理由: 実装は承認済み招待の確認に 409 を返す（design/012 § API設計に明記あり）。spec/012 の権限境界表は「未認証 401 / token 不正 404 / 期限切れ・失効 410」までで 409 に触れていない。design と実装は一致しているが、spec だけ記載が欠ける。
- 修正案: spec/012 § 権限境界の「招待内容の確認」行に「承認済みは 409」を追記する。
- 確認が必要な判断点: なし。

## 観点4: 権限境界の整合

**整合（不一致なし）**: `constitution.md § 権限ポリシー` と spec/013 の境界が実装に一致。

- 認証・権限を通さない Route Handler は `auth/signup` と `auth/login` の 2 本のみで、いずれも spec/011 で「認証不要」と規定済み。**それ以外の 21 ルートはすべて** `checkBoardAccess` / `checkListAccess` / `checkCardAccess` / `getSessionUser` を通す。
- 最小権限の割当が仕様どおり（閲覧 viewer 以上 / 書き込み member 以上 / ボード編集・削除・purge・ロール変更・メンバー削除・招待操作は owner）。
- 判定順序が「認証 → 対象存在 → 権限 → 入力検証」で統一（`checkListAccess` / `checkCardAccess` は対象不在時も未認証を優先して 401 を返す）。
- 非メンバーは 404、メンバーの権限不足は 403 と厳密に区別（`AccessResult` の型で表現）。
- 最後の owner の降格・削除を 409 で拒否し、`countOwners` の確認と更新を同一処理内で実施。
- メンバー一覧は `select` で `id/name/email` のみ取得し `passwordHash` を返さない。

## 観点5: 用語の整合

**整合（不一致なし）**: `constitution.md § 用語集 / 権限ポリシー` と仕様・設計・コード命名が一致。

- ロール名 `owner` / `member` / `viewer` が constitution・spec・design・Prisma enum（`BoardRole`）・コード（`RANK`）で完全一致。
- ボード（Board）／カード（Card）／リスト（List）／担当者（Assignee）などの英訳がモデル名・API パスと一致。
- 招待の状態は `pending` / `accepted` / `revoked` で spec・design・`InviteStatus` enum・UI 表示（招待中／参加済み／失効）が対応。
- エラーコード `UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` / `CONFLICT` / `GONE` / `VALIDATION_ERROR` / `INTERNAL_ERROR` が spec/000 と `lib/errors.ts` で一致。

## 観点6-8: デザインシステム / コンポーネント / 共通レイアウト

**整合（不一致なし）**

- **トークン**: 新規画面（login / signup / members / invites）は hex 直書きなし。`bg-background` / `text-muted-foreground` / `border-border` / `text-destructive` / `font-heading` などの semantic class のみ。
- **コンポーネント**: フォームは shadcn の `Button` / `Input` / `Label` / `Card` / `Badge` / `Avatar` を使用。native `<select>`（ロール選択・招待ロール）は design-system で認めた例外で、`border-input` / `focus-visible:ring-ring/50` などトークン由来の class を適用済み。リンクのボタン表示は `buttonVariants` を適用（base-nova で `asChild` を使わない方針に準拠）。
- **共通レイアウト**: `/boards/[boardId]/members` は `AppShell` で包み breadcrumb（ボード一覧 → ボード名 → メンバー）を渡す。**認証系（`/login` `/signup`）と招待受け入れ（`/invites/[token]`）は AppShell を使わず全画面中央のカードパネル**で統一しており、design-system 工程で決めた「認証系は別ルール」に一致。

## 観点9: 設計準拠（構造）

### I2 [Important] design/011 が固定した `requireUser()` が実装されていない

- 観点: 設計準拠（構造）
- 対象ファイル: `lib/auth/session.ts`（未定義）/ `app/api/auth/logout/route.ts`・`app/api/auth/session/route.ts`・`app/api/boards/route.ts`・`app/api/invites/[inviteId]/{resend,revoke}/route.ts`・`app/api/invites/token/[token]/{route,accept/route}.ts`
- 問題の理由: design/011 § 共通部品は `requireUser()` を定義し、§ 実装方針で「認証必須の判定は `requireUser()` に集約し、各 Route Handler では早期 return のみ書く（重複実装を避ける）」と固定している。実装には `requireUser` が存在せず、`const user = await getSessionUser(); if (!user) return unauthorized();` が 7 箇所に重複している。**振る舞いは仕様どおり（401 を返す）で機能差はない**が、設計が集約先として決めた構造から逸脱しており、今後 401 の扱いを変える際の修正漏れリスクがある。
- 修正案: `lib/auth/session.ts`（または `lib/auth/permissions.ts`）に `requireUser(): Promise<{ user } | { response: Response }>` 相当を追加し、7 箇所を置き換える。あるいは design/011 の記述を実装に合わせて「`getSessionUser()` + `unauthorized()` を各ハンドラで使う」に改める。
- 確認が必要な判断点: 実装を設計に合わせる（`requireUser` 追加・推奨）か、設計を実装に合わせて記述変更するか。

---

## 全体総括

1. **Critical なし。** 認証必須化（21 ルート）、権限境界（404/403 の区別）、招待の本人性（email 一致 403）、最後の owner 保護（409）、scrypt ソルト付きハッシュ、CSPRNG 32 バイトトークン、レスポンスからの `passwordHash` 除外は、いずれも仕様・設計どおりに実装されている。
2. **Important 2 件**: ①招待リンク経由のログイン後に承認画面へ戻らない（spec/012 の画面導線が未実装 = 機能差）、②`requireUser()` 未実装による認証判定の重複（design/011 の集約方針からの構造逸脱、振る舞い差なし）。
3. **Polish 4 件**: 確認 API の `status` 欠落、未使用の `CURRENT_USER`、ログインの型不正 422、spec/012 権限境界表の 409 記載漏れ。

## 次のアクション候補

- **Important（実装前に方針確定を推奨）**
  - I1 → **推奨: 実装を修正**。`/login?redirect=<相対パス>` を追加し、相対パス限定の検証（`/` 始まり・`//` を含まない）でオープンリダイレクトを防ぐ。招待フローの完走性に関わるため優先。
  - I2 → **推奨: 実装を修正**（`requireUser()` を追加して 7 箇所を置換）。設計の集約方針を守るほうが後続の保守で安全。
- **Polish**
  - P1（`status` 追加 or 仕様修正）、P2（`CURRENT_USER` 削除）、P3（ログイン失敗を 401 に統一 or 仕様追記）、P4（spec/012 に 409 追記）。

**推奨案**: I1 → I2 → P2 → P4 → P1/P3 の順で対応する。いずれも仕様・設計・実装を**まだ書き換えていない**ため、修正対象（上記ファイル）と方針の承認をいただいてから着手する。
