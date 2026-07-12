# メンバー招待 運用 runbook

Simple Kanban のメンバー招待機構 (Invite テーブル、 平文 token + SHA-256 hash 保存) の運用手順とトラブルシューティング。

## 概要

- **招待作成** = `owner` のみ。 `email` + `role (member/viewer)` を指定。
- **招待 URL** = `<APP_BASE_URL>/invites/<平文 token>`。 `APP_BASE_URL` 未設定時は `/invites/<token>` の相対パスが返る (dev 用)。
- **平文 token** = 24 byte crypto ランダム、 base64url 32 文字前後。 API レスポンスで 1 度のみ返し、 DB には SHA-256 hex 64 文字で保存 (`Invite.tokenHash`)。
- **有効期限** = 発行時 + 7 日 (`INVITE_EXPIRES_MS`)。 期限切れは `410 expired` を返す。
- **状態** = `pending` → `accepted` / `revoked` の 3 種。 期限切れは `pending` のまま保持され、承認 API で `410 expired` を返す (自動遷移なし)。
- **メール送信** = 本 spec 対象外。 UI で招待 URL を表示 / コピーして手動で共有する。

## 起動時の依存

- `APP_BASE_URL` 環境変数 (絶対 URL、 例 `https://kanban.example.com`) を `.env` に設定する。 未設定でも動作するが、 API レスポンスの `url` が相対パスになる。
- 認証機構 (`docs/runbook/011_auth.md`) が起動していること。

## 招待の cleanup

- `accepted` / `revoked` / 期限切れ `pending` の Invite は物理削除しない (履歴として保持)。
- 累積が問題になった場合、 手動 cleanup 例 =
  ```bash
  npx tsx -e 'import { PrismaClient } from "@prisma/client"; const p = new PrismaClient(); (async () => { const r = await p.invite.deleteMany({ where: { OR: [ { status: "accepted" }, { status: "revoked" }, { AND: [ { status: "pending" }, { expiresAt: { lt: new Date() } } ] } ] } }); console.log(JSON.stringify(r)); await p.$disconnect(); })();'
  ```
- 定期 cleanup は本 spec 対象外 (`spec/012_member_invite.md § 未決事項`)。

## 監査ログ

`event` (`invite.list` / `invite.create` / `invite.resend` / `invite.revoke` / `invite.view` / `invite.accept`) を 1 行 JSON で標準出力に記録する。 平文 token / hash は含めない。

例 (承認)。

```json
{
  "timestamp": "2026-07-12T20:00:00.000Z",
  "level": "info",
  "event": "invite.accept",
  "actorId": "usr_abc",
  "targetType": "invite",
  "targetId": "clx_invite1",
  "status": 200
}
```

## トラブルシューティング

### 招待 URL を紛失した

- 対処 = owner が `/boards/<boardId>/members` 画面から対象招待の「再送」 を実行する。 新 URL が発行され、旧 URL は即無効化される。

### 「招待は期限切れです」 が表示される

- 発行時 + 7 日を過ぎている。 owner が該当招待に対して 「再送」 を実行すると、 `expiresAt` が現在時刻 + 7 日に更新され再利用可能になる。
- `status = pending` のままなので新規作成ではなく再送経路で更新できる。

### 「既にこのボードのメンバーです」 が承認時に表示される

- 招待受領者が別経路 (別の招待、または既に BoardMembership がある) で対象ボードのメンバーになっている。
- 該当ボードは自分のボード一覧 (`/`) から開ける。 招待は消費されず `pending` のまま残るため、必要なら owner が失効させる。

### 招待作成で `422 already_member` が返る

- 指定 `email` を持つ User が既に対象ボードの `BoardMembership` を持っている。 メンバー管理画面で該当ユーザーのロールを変更する経路を案内する。

### 招待作成で `422 pending_exists` が返る

- 同一 `(boardId, email)` で `pending` の招待が既に 1 件存在する。 新規作成ではなく 「再送」 経路を使う。

### 招待 URL を開くと 404 になる

- 平文 `token` が hash と一致しない (URL のコピペミス、末尾スペース、URL エンコード違反)。
- token の base64url 文字集合は `[A-Za-z0-9_-]` のみ。 URL の末尾スペース / 前後空白を削って再度開く。

### 期限切れ / 失効済み / 使用済みの区別

- 承認 API のレスポンス body `{ "reason": "expired" | "revoked" | "already_used" }` で区別する。 UI は `reason` に応じたメッセージを表示する。

## セキュリティ考慮

- **平文 token を DB に保存しない**。 SHA-256 hash 経路で検索する。
- **平文 token をログに残さない**。 `invite.create` / `invite.resend` のログにも `token` は含まれない (`tokenHash` も含めない)。
- **平文 token はレスポンスで 1 度のみ返す**。 再取得は失効 → 再作成 (or 再送)。
- **招待 URL のクエリ文字列使用禁止**。 パスパラメータ (`/invites/<token>`) 経由で受け渡す (Referer 経由の漏洩防止)。
- **承認時に招待の email と承認ユーザーの email の一致確認を行わない** (`spec/012_member_invite.md § FR-03`)。 URL 保有 = 承認権利、 の設計。 メールアドレス確認を強制したい場合は将来 spec 追加。
- 招待 API のレスポンスに `Cache-Control: no-store` を付与する (プロキシ / ブラウザキャッシュ回避)。

## 未対応 (`spec/012_member_invite.md § 未決事項`)

- メール送信 (招待 URL を自動配信)
- QR コード / short link
- 招待メール文面のカスタマイズ / 多言語対応
- 招待の期限延長 (resend 以外の経路)
- 招待の物理削除経路 (cleanup job)
