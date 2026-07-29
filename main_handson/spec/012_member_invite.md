# メンバー招待の仕様

## 概要

ボードの owner がメンバーを招待する機能。招待の作成（リンク発行）・承認・再送・失効を定義する。招待の有効期限は 7 日。

## 既存仕様との関係

- 共通規約（エラー形式・ステータス・ログ方針）は `spec/000_shared_rules.md` を参照する。
- 認証（User / Session）は `spec/011_auth.md`。ロールとボードメンバー（BoardMembership）は `spec/013_permissions.md`。
- 招待の承認により BoardMembership が作成される（ロールは招待時に指定した値）。

## 対象データ

- Invite
  - `id`: string（サーバー採番）
  - `boardId`: string（招待対象のボード）
  - `email`: string（招待先メールアドレス。メールアドレス形式）
  - `role`: string（`member` / `viewer` のいずれか。owner は招待で付与しない）
  - `token`: string（**暗号論的乱数（CSPRNG）で 32 バイト以上を生成し、URL-safe な文字列にエンコードした値**・一意。招待リンクに含める）
  - `status`: string（`pending` / `accepted` / `revoked`）
  - `expiresAt`: datetime（発行時刻の 7 日後）
  - `invitedByUserId`: string（招待を作成した owner）
  - `createdAt`: datetime
  - `updatedAt`: datetime
- 同一ボード内で `status = pending` かつ同一 `email` の Invite は 1 件までとする。
- 招待の有効判定は `now < expiresAt` かつ `status = pending` とする。
- トークン強度は教材用の簡略仕様であり、実運用の認証方針を示すものではない。
- ボード削除時、そのボードの Invite も削除する（`spec/000_shared_rules.md` § 削除の連鎖）。

## 機能要件

### 操作: 招待の作成（FR-001）

- owner が `email` と `role`（member / viewer）を指定して招待を作成する。
- `token` を発行し、`expiresAt` を作成時刻の 7 日後に設定し、`status = pending` とする。
- 指定した `email` のユーザーが**既にそのボードのメンバーである場合は作成しない**（409 / CONFLICT）。
- 完了条件: Invite が 1 件作成され、招待リンク（`token` を含む URL）が返る。

### 操作: 招待リンクの発行（FR-002）

- 招待の `token` を含む**相対パス** `/invites/{token}` を招待リンクとして返す（オリジンは画面側で付与する）。
- 完了条件: 招待作成・再送のレスポンスに招待リンクが含まれる。

### 操作: 招待の承認（FR-003）

- 招待リンクの `token` を受け取り、ログイン中のユーザーをそのボードのメンバーとして登録する（`role` は招待時の値）。
- **本人性の確認**: 招待の `email` とログイン中ユーザーの `email` が**一致することを必須**とする。不一致の場合は承認せず 403 / FORBIDDEN を返す（招待リンクの流出時に第三者が参加することを防ぐ）。
- ログイン中ユーザーが**既にそのボードのメンバーである場合は承認しない**（409 / CONFLICT）。**既存のロールは上書きしない**（意図しない降格を防ぐ）。
- 承認後、招待の `status` を `accepted` にする。
- 完了条件: BoardMembership が作成され、招待が `accepted` になり、以後同じ token では承認できない。

### 操作: 招待の再送（FR-004）

- owner が `pending` の招待を再送する。`token` を**新しい値で上書き**し（旧 token は無効になる）、`expiresAt` を再送時刻の 7 日後に更新する。
- 完了条件: 新しい招待リンクが返り、旧 token では承認できない。

### 操作: 招待の失効（FR-005）

- owner が `pending` の招待を失効させる（`status = revoked`）。
- 完了条件: 招待が `revoked` になり、その token では承認できない。

### 操作: 招待一覧の取得（FR-006）

- owner がボードの招待一覧（`pending` / `accepted` / `revoked`）を取得する。
- 完了条件: `{ items: [...] }` 形状で招待を返す（`token` は含めない）。

## 画面

- `/boards/[boardId]/members`（メンバー・招待管理画面。owner のみ操作可能）
  - 招待フォーム: `email` 入力 ＋ `role` 選択（member / viewer）＋ 招待ボタン。
  - 招待一覧: メールアドレス / ロール / 状態（招待中・参加済み・失効）/ 有効期限。各行に「再送」「失効」操作（`pending` のみ）。
  - 招待作成・再送の直後に招待リンクを画面に表示し、コピーできるようにする。
  - 招待が 0 件のときは「招待はありません」を表示する。
- `/invites/[token]`（招待受け入れ画面）
  - 招待内容（ボード名・付与されるロール）を表示し、「参加する」で承認する。
  - 未ログインの場合はログイン（またはサインアップ）へ誘導し、認証後に承認へ戻る。
  - 期限切れ・失効・使用済みの場合は、その旨のメッセージを表示する（参加操作は行えない）。
- 画面状態: 招待中 / 参加済み / 失効 / 期限切れ、送信中、エラー表示。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards/[boardId]/invites | 招待一覧の取得 | owner |
| POST | /api/boards/[boardId]/invites | 招待の作成（body: `{ email, role }`） | owner |
| POST | /api/invites/[inviteId]/resend | 招待の再送（token 再発行・期限更新） | owner |
| POST | /api/invites/[inviteId]/revoke | 招待の失効 | owner |
| GET | /api/invites/token/[token] | 招待内容の確認（ボード名・ロール・状態） | 認証済み |
| POST | /api/invites/token/[token]/accept | 招待の承認（メンバー登録） | 認証済み |

## 受入条件

- [ ] POST /api/boards/[boardId]/invites に有効な `email` と `role=member` を渡すと 201 で招待が作成され、招待リンクが返る
- [ ] 作成された招待の `expiresAt` が作成時刻の 7 日後である
- [ ] 作成された招待の `status` が `pending` である
- [ ] `role` に `owner` を指定すると 422 / VALIDATION_ERROR を返す
- [ ] `role` が member / viewer 以外の値のとき 422 / VALIDATION_ERROR を返す
- [ ] `email` がメールアドレス形式でないとき 422 / VALIDATION_ERROR を返す
- [ ] 同一ボードに同一 `email` の `pending` 招待が既にある状態で再度作成すると 409 / CONFLICT を返す
- [ ] 既にそのボードのメンバーであるユーザーの `email` に招待を作成すると 409 / CONFLICT を返す
- [ ] 発行された招待 `token` の長さが 32 文字以上である
- [ ] 連続して 2 件の招待を作成すると、それぞれの `token` が一致しない
- [ ] 招待リンクが相対パス `/invites/{token}` 形式で返る
- [ ] owner 以外（member / viewer）が招待を作成すると 403 / FORBIDDEN を返す
- [ ] 未ログインで招待を作成すると 401 / UNAUTHORIZED を返す
- [ ] 存在しない `boardId` への招待作成は 404 / NOT_FOUND を返す
- [ ] GET /api/boards/[boardId]/invites は `{ items: [...] }` 形状で 200 を返す
- [ ] 招待一覧のレスポンスに `token` が含まれない
- [ ] 招待が 0 件のとき一覧は `{ items: [] }` を 200 で返す
- [ ] POST /api/invites/token/[token]/accept を有効な token で実行すると 200 を返し、BoardMembership が作成される
- [ ] 承認後、招待の `status` が `accepted` になる
- [ ] 承認で作成された BoardMembership の `role` が招待時に指定した `role` と一致する
- [ ] 招待の `email` と異なる email のユーザーがログイン中に承認すると 403 / FORBIDDEN を返し、BoardMembership が作成されない
- [ ] 既にそのボードのメンバーであるユーザーが承認すると 409 / CONFLICT を返し、既存のロールが変更されない
- [ ] 同じ token で 2 回目の承認を行うと 409 / CONFLICT を返す
- [ ] 存在しない token で承認すると 404 / NOT_FOUND を返す
- [ ] 有効期限を過ぎた招待の token で承認すると 410 / GONE を返す
- [ ] 失効済み（revoked）の招待の token で承認すると 410 / GONE を返す
- [ ] 未ログインで承認すると 401 / UNAUTHORIZED を返す
- [ ] POST /api/invites/[inviteId]/resend は 200 を返し、新しい招待リンクが返る
- [ ] 再送後、旧 token での承認は 404 / NOT_FOUND を返す
- [ ] 再送後の `expiresAt` が再送時刻の 7 日後に更新される
- [ ] owner 以外が再送・失効を実行すると 403 / FORBIDDEN を返す
- [ ] POST /api/invites/[inviteId]/revoke は 200 を返し、招待の `status` が `revoked` になる
- [ ] 既に `accepted` の招待を再送・失効しようとすると 409 / CONFLICT を返す
- [ ] 存在しない `inviteId` の再送・失効は 404 / NOT_FOUND を返す
- [ ] ボードを削除すると、そのボードの招待も削除され、当該 token での承認は 404 / NOT_FOUND を返す

## 異常系

- 存在しない `boardId` / `inviteId` / `token` は 404 / NOT_FOUND。
- 有効期限切れの招待、失効済み（revoked）の招待の承認は 410 / GONE。
- 既に承認済み（accepted）の招待の再承認・再送・失効は 409 / CONFLICT。
- 同一ボード・同一 email の `pending` 招待の重複作成は 409 / CONFLICT。
- 既にそのボードのメンバーである email への招待作成、および既にメンバーであるユーザーによる承認は 409 / CONFLICT（既存ロールは変更しない）。
- 招待の `email` とログイン中ユーザーの `email` が一致しない承認は 403 / FORBIDDEN。
- `email` 形式不正、`role` が member / viewer 以外（owner 指定を含む）は 422 / VALIDATION_ERROR。
- 未ログインは 401 / UNAUTHORIZED。owner 以外の招待作成・再送・失効は 403 / FORBIDDEN（対象ボードの閲覧権限もない場合は 404）。

## 境界条件

- 招待作成直後（`expiresAt` まで 7 日）: 承認可能。
- 有効期限の 1 秒前: 承認可能（200）。
- 有効期限ちょうど（`expiresAt` と同時刻）: 期限切れとして 410。
- 有効期限の 1 秒後: 410。
- 招待 0 件のボード: 一覧は空配列。
- 同一 email への 2 回目の招待: 先の招待が `pending` なら 409、`revoked` / `accepted` なら作成可能。
- 承認 1 回目: 成功。2 回目: 409。

## バリデーション

- `email`: 必須。メールアドレス形式は `^[^\s@]+@[^\s@]+\.[^\s@]+$` を満たすこと（`spec/011_auth.md` と同一の簡易判定）。形式不正は 422。
- `role`: 必須。`member` / `viewer` のいずれか。`owner` およびそれ以外の値は 422。
- `token`: 必須（パス）。該当する招待が存在しなければ 404。期限切れ・失効は 410。
- 承認時: 招待の `email` とログイン中ユーザーの `email` が一致すること。不一致は 403。ログイン中ユーザーが既にメンバーの場合は 409。
- `boardId` / `inviteId`: 必須（パス）。存在しなければ 404。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| 招待の作成 | owner | 未認証は 401、owner 以外は 403、ボードなしは 404、入力不備は 422、重複は 409 |
| 招待一覧の取得 | owner | 未認証は 401、owner 以外は 403、ボードなしは 404 |
| 招待の再送 | owner | 未認証は 401、owner 以外は 403、招待なしは 404、accepted は 409 |
| 招待の失効 | owner | 未認証は 401、owner 以外は 403、招待なしは 404、accepted は 409 |
| 招待内容の確認 | 認証済み（招待の token 保持者） | 未認証は 401、token 不正は 404、期限切れ・失効は 410 |
| 招待の承認 | 認証済み**かつ招待の email と一致するユーザー** | 未認証は 401、email 不一致は 403、token 不正は 404、期限切れ・失効は 410、承認済み・既メンバーは 409 |

## ログ

- 招待の作成・再送・失効・承認（成功／失敗）を操作ログに記録する。リクエスト ID を付与する（`spec/000_shared_rules.md` § ログ方針）。
- 記録する項目: リクエスト ID / 操作種別 / `boardId` / `inviteId` / 招待先 `email` / 実行ユーザー `userId` / 結果。
- **招待 `token` をログに出力しない**（リンクを知る者が承認できるため）。

## ドキュメント化に必要なユーザー操作

- メンバーを招待する（メンバー管理画面で email とロールを指定）。
- 招待リンクを共有する。
- 招待を再送する / 失効させる。
- 招待リンクから参加する（ログインまたはサインアップ後に承認）。
- 招待が期限切れ・失効のときの対処（owner に再送を依頼する）。
- 招待されたメールアドレスと違うアカウントでログインしている場合の対処（招待されたメールアドレスのアカウントでログインし直す）。

## 非機能要件

- 招待一覧取得の応答時間は200ms以内、招待の作成・再送・失効・承認の応答時間は300ms以内（constitution.md § 性能）。
- 招待の有効期限は発行から 7 日。
- 操作ログ・エラーログにリクエスト ID を付与する（`spec/000_shared_rules.md`）。

## 使用する用語

- ボード（Board）（constitution.md § 用語集 参照）
- ロール（owner / member / viewer）（constitution.md § 権限ポリシー 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- spec/011_auth.md
- spec/013_permissions.md
- inputs/011_013_auth_invite_permissions_spec_input.md

## 未決事項

- 招待メールの送信は本仕様の対象外（招待リンクを画面に表示して共有する方式）。メール送信は将来要件。
- 招待先 `email` と承認ユーザーの email の一致は**必須で確定済み**（不一致は 403）。招待メール導入時も同方針を維持する。
