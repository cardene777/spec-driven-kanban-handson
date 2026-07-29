# 運用 runbook: 認証・メンバー招待・権限管理

対象読者: 運用担当
対象仕様: `spec/011_auth.md` / `spec/012_member_invite.md` / `spec/013_permissions.md`
対象実装: `app/api/auth/**` / `app/api/boards/[boardId]/members/**` / `app/api/boards/[boardId]/invites/**` / `app/api/invites/**`
運用設定: `package.json` / `.env.example` / `prisma/`

## 前提（この環境の構成）

| 項目 | 内容 |
|---|---|
| ランタイム | Node.js 20.19 以上（本リポジトリでの動作確認は 22 系） |
| フレームワーク | Next.js 16（App Router） |
| データベース | SQLite（ローカルファイル） |
| ORM | Prisma 7（`@prisma/adapter-better-sqlite3`） |
| 環境変数 | `DATABASE_URL`（`.env`）、`NODE_ENV` |
| ログ出力 | 標準出力 / 標準エラーへの **JSON 1 行**（`lib/audit/log.ts`） |

> 本環境は**ローカル開発用**を前提としています（`constitution.md § 非機能要件`）。稼働率の数値目標は設けていません。

### 運用コマンド

| 目的 | コマンド |
|---|---|
| 開発サーバー起動 | `npm run dev` |
| 本番ビルド | `npm run build` |
| 本番起動 | `npm run start` |
| 静的検査 | `npm run lint` / `npm run typecheck` |
| テスト | `npm test` |
| マイグレーション適用（開発） | `npx prisma migrate dev` |
| マイグレーション適用（既存 DB へ反映のみ） | `npx prisma migrate deploy` |
| Prisma Client 再生成 | `npx prisma generate` |
| DB の中身を確認 | `npx prisma studio` |

### 環境変数

| 変数 | 既定値・例 | 影響 |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite ファイルの場所。`prisma.config.ts` が `file:./dev.db` を `prisma/dev.db` に読み替える |
| `NODE_ENV` | `development` / `production` | `production` のときのみセッション Cookie に `Secure` 属性が付与される（`lib/auth/session.ts`） |

---

## 障害シナリオ

### S1. 全ユーザーがログインできない

**症状**: ログイン画面で「メールアドレスまたはパスワードが正しくありません」が全員に出る／ログイン後すぐログイン画面に戻される。

#### 確認手順

1. サーバーが起動しているか確認する。
   ```bash
   curl -i http://localhost:3000/api/auth/session
   ```
   - `401` が返る: サーバーは正常（未ログインの想定どおりの応答）。
   - 接続できない: プロセスが落ちている → S4 へ。
   - `500` が返る: DB 接続の可能性 → S3 へ。
2. ログイン試行時のログを確認する（`auth.login_failed` の `reason`）。
   ```bash
   npm run start 2>&1 | grep '"action":"auth.login_failed"'
   ```
   - `"reason":"no_user"` が多数 → ユーザーレコードが失われている可能性（S3 の DB 確認へ）。
   - `"reason":"bad_password"` が多数 → 認証ロジックではなく入力側の可能性。特定ユーザーのみなら S2 へ。
3. ユーザーが DB に存在するか確認する。
   ```bash
   npx prisma studio   # User テーブルを開く
   ```

#### 復旧手順

- **DB ファイルが失われている場合**: バックアップから `prisma/dev.db` を復元し、サーバーを再起動する。バックアップが無い場合、ユーザーは再作成（サインアップ）が必要。
- **マイグレーション未適用の場合**（`User` / `Session` テーブルが無い）:
  ```bash
  npx prisma migrate deploy
  npx prisma generate
  npm run build && npm run start
  ```
- **Cookie が保存されない場合**: `NODE_ENV=production` かつ HTTP（非 HTTPS）で配信していると、`Secure` 属性付き Cookie がブラウザに保存されずログインが継続しない。HTTPS で配信するか、検証環境では `NODE_ENV` を `production` 以外にする。

---

### S2. 特定のユーザーだけログインできない

**症状**: 一部の利用者のみ「メールアドレスまたはパスワードが正しくありません」。

#### 確認手順

1. `auth.login_failed` ログの `email` と `reason` を確認する。
   ```bash
   grep '"action":"auth.login_failed"' <ログ> | grep '<対象メールアドレス>'
   ```
   - `no_user`: そのメールアドレスのアカウントが存在しない（未登録／別アドレスで登録）。
   - `bad_password`: パスワード誤り。
2. `User` テーブルに該当 email が存在するか `npx prisma studio` で確認する。

#### 復旧手順

- **未登録の場合**: 利用者にサインアップを案内する。
- **パスワード誤りの場合**: **本バージョンにパスワード再設定機能はありません**（`spec/011_auth.md § 未決事項`）。運用としては次のいずれかで対応する。
  1. 利用者に別メールアドレスでの新規登録を案内し、オーナーが再招待する。
  2. 暫定対応として、運用担当がアカウントを作り直す（旧アカウントのボード権限は引き継がれないため、オーナーによる再招待が必要）。

> パスワードは scrypt でソルト付きハッシュ化されており、**保存値から平文を復元することはできません**。DB を直接見てもパスワードは分かりません。

---

### S3. API が 500 を返す / データベースにアクセスできない

**症状**: 画面操作で「予期しないエラーが発生しました」が表示される。

#### 確認手順

1. エラーログを確認する（`level: "error"` の行）。
   ```bash
   grep '"level":"error"' <ログ>
   ```
   `requestId` / `status` / `message` が出力される。
2. `requestId` で同一リクエストの操作ログを突き合わせる。
   ```bash
   grep '<requestId>' <ログ>
   ```
3. DB ファイルの存在と権限を確認する。
   ```bash
   ls -l prisma/dev.db
   ```
4. スキーマと DB の同期を確認する。
   ```bash
   npx prisma migrate status
   ```

#### 復旧手順

```bash
# 1) 未適用のマイグレーションを適用
npx prisma migrate deploy
# 2) Prisma Client を再生成（型とスキーマの不一致を解消）
npx prisma generate
# 3) 再ビルド・再起動
npm run build && npm run start
```

- DB ファイル破損が疑われる場合はバックアップから `prisma/dev.db` を復元する。
- 復旧後、`npm test` で回帰がないことを確認する。

---

### S4. サーバーが起動しない

#### 確認手順

1. `npm run build` の出力を確認する（型エラー・依存の欠落）。
2. Node.js のバージョンを確認する（20.19 以上）。
   ```bash
   node -v
   ```
3. `.env` の `DATABASE_URL` が設定されているか確認する。

#### 復旧手順

```bash
npm ci                 # 依存を再インストール
npx prisma generate    # Prisma Client を生成
npm run build
npm run start
```

---

### S5. 招待リンクで参加できない

**症状**: 招待された方が「招待が見つかりません」「招待の有効期限が切れています」「別のアカウントでログインしています」と表示される。

#### 確認手順

1. 承認失敗のログを確認する。理由が `reason` に出力される。
   ```bash
   grep '"action":"invite.accept_failed"' <ログ>
   ```

   | `reason` | 意味 | 画面表示 |
   |---|---|---|
   | `expired` | 有効期限（発行から 7 日）超過 | 招待の有効期限が切れています |
   | `revoked` | オーナーが失効させた | 招待の有効期限が切れています |
   | `already_accepted` | 既に承認済み | この招待は使用済みです |
   | `email_mismatch` | 招待先と別アカウントでログイン | 別のアカウントでログインしています |
   | `already_member` | 既にそのボードのメンバー | 既にメンバーです |

2. 「招待が見つかりません」（404）の場合、`invite.accept_failed` は記録されません。**再送によって旧リンクが無効化された**可能性が高いため、`invite.resend` ログを確認する。
   ```bash
   grep '"action":"invite.resend"' <ログ>
   ```

#### 復旧手順

- **期限切れ・失効・旧リンク**: ボードのオーナーに「メンバー」画面から**再送**を依頼し、新しいリンクを共有してもらう。
- **メールアドレス不一致**: 招待先メールアドレスのアカウントでログインし直してもらう。**この制限は仕様による安全策のため、運用側で回避しない**（`spec/012_member_invite.md`）。宛先を変えたい場合は、オーナーが既存の招待を失効させ、正しいアドレスで招待し直す。
- **既にメンバー**: 対応不要。ボード一覧から利用できる。

---

### S6. ボードのオーナーが不在になった／権限を変更できない

**症状**: 「最後のオーナーは降格できません」「最後のオーナーは削除できません」が表示される。または、オーナーだった方が退職・アカウント削除で操作できない。

#### 確認手順

1. 拒否ログを確認する。
   ```bash
   grep '"action":"member.last_owner_denied"' <ログ>
   ```
2. 対象ボードのオーナー数を確認する。
   ```bash
   npx prisma studio   # BoardMembership を boardId で絞り、role=owner の件数を数える
   ```

#### 復旧手順

- **オーナーが 1 人いる場合**: そのオーナーが「メンバー」画面で別の方を `owner` に変更してから、自身の権限を変更・削除する（仕様上、各ボードには常に 1 人以上のオーナーが必要）。
- **オーナーが 0 人になっている場合**（想定外の状態）: 通常操作では発生しない。発生した場合は DB を直接修正する。
  ```bash
  npx prisma studio
  # BoardMembership の対象レコードの role を owner に変更する
  ```
  実施後、`member.role_change` に該当しない変更のため、**変更内容（boardId / userId / 変更理由 / 実施者）を運用記録に残す**こと。

---

### S7. 招待リンクが意図しない相手に渡った

#### 確認手順

1. 対象ボードの招待一覧をオーナーに確認してもらう（「メンバー」画面）。
2. 招待の作成・承認ログを確認する。
   ```bash
   grep -E '"action":"invite.(create|accept)"' <ログ>
   ```
   `boardId` / `inviteId` / `email` / 承認時の `userId` が記録されている。

#### 復旧手順

1. オーナーに該当招待の**失効**を依頼する（以後そのリンクでは参加できない）。
2. 既に参加されている場合は、「メンバー」画面から該当メンバーを**削除**する。
3. 必要に応じて、正しい宛先へ招待し直す。

> リンクが流出しても、**招待先メールアドレス以外のアカウントでは参加できません**（不一致は拒否されます）。

---

## ログ確認

### 形式

`lib/audit/log.ts` が標準出力／標準エラーへ JSON を 1 行で出力する。

```json
{"ts":"2026-07-21T09:20:03.608Z","level":"info","requestId":"<uuid>","action":"auth.login","userId":"clx..."}
{"ts":"2026-07-21T09:20:04.101Z","level":"error","requestId":"<uuid>","status":500,"message":"..."}
```

- `requestId` はリクエストごとに発行され、**同一リクエストの操作ログとエラーログを突き合わせられる**。
- 調査は `requestId` での grep が基本。

```bash
# 特定リクエストの全ログ
grep '<requestId>' <ログ>
# エラーのみ
grep '"level":"error"' <ログ>
```

### 本機能で出力される操作ログ

| action | 出力箇所 | 主な項目 |
|---|---|---|
| `auth.signup` | サインアップ成功 | `userId` |
| `auth.login` | ログイン成功 | `userId` |
| `auth.login_failed` | ログイン失敗 | `email`, `reason`（`no_user` / `bad_password`） |
| `auth.logout` | ログアウト | `userId` |
| `invite.create` | 招待作成 | `boardId`, `inviteId`, `email`, `role`, `actorUserId` |
| `invite.resend` | 招待再送 | `boardId`, `inviteId`, `actorUserId` |
| `invite.revoke` | 招待失効 | `boardId`, `inviteId`, `actorUserId` |
| `invite.accept` | 招待承認 | `boardId`, `inviteId`, `userId`, `role` |
| `invite.accept_failed` | 承認失敗 | `inviteId`, `reason` |
| `member.role_change` | ロール変更 | `boardId`, `targetUserId`, `beforeRole`, `afterRole`, `actorUserId` |
| `member.remove` | メンバー削除 | `boardId`, `targetUserId`, `actorUserId` |
| `member.last_owner_denied` | 最後のオーナー保護による拒否 | `boardId`, `targetUserId` |

### ログに出力されない情報（意図的）

- パスワードの平文、`passwordHash`
- セッショントークン、招待トークン

`auth.login_failed` の `reason` は**ログにのみ**記録され、API 応答では区別されません（`spec/011_auth.md`）。

---

## 監視項目

現状の環境で**確認できる**項目は次のとおり（いずれも手動での grep / 目視）。

| 監視したいこと | 現在の確認方法 |
|---|---|
| ログイン失敗の多発（総当たりの兆候） | `grep '"action":"auth.login_failed"' \| wc -l` を定期実行し件数を比較 |
| 招待承認の失敗傾向 | `grep '"action":"invite.accept_failed"'` の `reason` 別集計 |
| 権限操作の追跡 | `member.role_change` / `member.remove` の履歴 |
| サーバーエラーの発生 | `grep '"level":"error"'` |
| マイグレーション適用状況 | `npx prisma migrate status` |

### ⚠️ 不足項目（実装に存在しないため、あるものとして運用しない）

以下は**実装されていません**。監視・アラートの前提にしないでください。

| 不足しているもの | 内容 | 影響 |
|---|---|---|
| ログ集約・永続化 | ログは標準出力／標準エラーへ出るのみ。ファイル保存・ローテーション・集約基盤なし | プロセス再起動で過去ログを追えない。調査が必要な場合は起動時に `npm run start 2>&1 \| tee app.log` などで自前保存する |
| メトリクス | リクエスト数・応答時間・エラー率などの計測機構なし | 性能目標（一覧200ms以内、書き込み300ms以内）の**継続的な計測手段がない** |
| アラート通知 | 閾値超過の通知機構なし | 障害は利用者からの申告で検知する運用になる |
| ヘルスチェック用エンドポイント | 専用の `/health` 等は未実装 | 死活監視は `GET /api/auth/session` が 401 を返すことで代替する |
| ログレベル `warn` | `lib/audit/log.ts` は `info`（`auditLog`）と `error`（`errorLog`）のみ。`design/013` が想定した warn 相当（`auth.login_failed` / `member.last_owner_denied` / `invite.accept_failed`）も **`info` で出力される** | レベルによる絞り込みができないため、`action` 名で grep する |
| 権限拒否ログ（`access.denied`） | `design/013_permissions.md § 監査ログ` に記載があるが**未実装**。403 / 404 による拒否は記録されない | 権限不足アクセスの傾向を追えない。必要なら実装追加が必要 |
| ログイン試行のレート制限 | 仕様で**対象外**と明記（`spec/011_auth.md § 非機能要件`） | 総当たり対策は未提供。教材用の簡略仕様 |
| セッションの定期クリーンアップ | 期限切れセッションは**参照時に削除**（遅延方式）。バッチなし | 未アクセスの期限切れセッション行が残る。運用上の実害は小さいが、行数が気になる場合は手動削除 |
| バックアップ | 自動バックアップの仕組みなし | `prisma/dev.db` のコピーを運用側で取得する必要がある |

---

## ⚠️ 警告: 仕様・実装・運用設定の間の不一致

以下は断定的な運用手順として記載していません。

### 警告 1: `design/013` の権限拒否ログが実装にない

- `design/013_permissions.md § 監査ログ` は「権限拒否（403 / 404）もログに記録する」「`access.denied` に `requiredRole` / `actualRole` を記録」と定めていますが、実装には該当ログがありません。
- 現状、**権限不足による拒否は追跡できません**。監視項目の表にも含めていません。

### 警告 2: ログレベルが設計と一致しない

- `design/011` / `design/013` は `auth.login_failed`・`member.last_owner_denied`・`invite.accept_failed` を **warn** レベルで記録すると定めていますが、実装ではすべて `info` で出力されます。
- ログを `level` で絞り込む運用は成立しないため、本 runbook では `action` 名での grep を手順にしています。

### 警告 3: 性能目標の計測手段がない

- `constitution.md § 非機能要件` は一覧200ms以内、書き込み300ms以内を目標としていますが、計測機構が実装されていません。
- 目標未達の判定は、現状**手動計測（`curl -w` など）でしか行えません**。

---

## 関連ファイル

| 種別 | パス |
|---|---|
| 仕様 | `spec/011_auth.md` / `spec/012_member_invite.md` / `spec/013_permissions.md` / `spec/000_shared_rules.md` |
| 設計 | `design/011_auth.md` / `design/012_member_invite.md` / `design/013_permissions.md` |
| 認証・権限の実装 | `lib/auth/{password,token,session,permissions}.ts` |
| ログ実装 | `lib/audit/log.ts` |
| エラー応答 | `lib/errors.ts` |
| データモデル | `prisma/schema.prisma` / `prisma/migrations/` |
| 運用設定 | `package.json` / `.env.example` / `prisma.config.ts` |
| テスト | `tests/auth/{auth,axes,units}.test.ts` |
| API リファレンス | `docs/api/011_013_auth_invite_permissions.md` |
| 利用者向けヘルプ | `docs/help/011_013_auth_invite_permissions.md` |
| レビュー | `review/011_013_auth_invite_permissions_review.md` |
