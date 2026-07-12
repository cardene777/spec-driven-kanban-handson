# 認証 運用 runbook

Simple Kanban の認証機構 (Cookie ベース Session、 パスワードハッシュ = scrypt) の運用手順とトラブルシューティング。

## 概要

- **認証方式** = Cookie ベース Session (Cookie 名 `sid`、 `HttpOnly` + `SameSite=Lax` + 本番のみ `Secure`)。
- **パスワードハッシュ** = Node 組み込みの `crypto.scryptSync` (N=16384, r=8, p=1)。 依存ライブラリ (bcryptjs 等) は追加しない。 実装 = `lib/auth/passwordHash.ts`。
- **Session 有効期限** = 7 日 (`SESSION_MAX_AGE_SECONDS`)。 絶対期限、 自動延長なし、 明示的な `POST /api/auth/refresh` で更新する。
- **User の一意 key** = `email` (小文字化して保存、 DB `@unique`)。

## 起動時の依存

1. `.env` に以下を設定する。
   - `DATABASE_URL="file:./dev.db"`
   - `APP_BASE_URL="http://localhost:3000"` (招待 URL の base として使う。 本番は本番 URL に置き換える)
   - `NEXT_PUBLIC_DEFAULT_USER_ID="user_default"` (Legacy 用、 詳細は `.env.example`)
2. `npm install`
3. `npx prisma generate`
4. `npx prisma migrate deploy` (本番) または `npx prisma migrate dev` (開発)
5. `npm run db:seed` (default ユーザーを 1 名投入。 email = `default@example.com` / password = `Default!123`)

## デプロイ時のチェック

- `NODE_ENV=production` の場合、 Cookie に `Secure` 属性が付与されるため HTTPS 必須。
- リバースプロキシ (Nginx / Caddy 等) を通す場合は `X-Forwarded-Proto` の扱いを確認し、Next.js に HTTPS 経由と認識させる (Next.js 16 は `next.config.ts` の `trustHostHeader` 等の設定は不要、リバースプロキシ側で `X-Forwarded-*` を透過)。
- Cookie の SameSite=Lax の挙動を影響する経路 (別ドメインからのフォーム POST) が無いことを確認する。

## パスワードハッシュのアップグレード

- 現行 = scrypt (N=16384)。 将来ハッシュコストを上げる場合、 `lib/auth/passwordHash.ts` の `N` 定数を変更する。
- 既存ユーザーのハッシュは古い `N` で保存されているため、 次回ログイン成功時に新 `N` で再ハッシュする経路が必要 (将来対応)。 現行では自動移行なし。

## Session の cleanup

- 期限切れの Session は DB に残り続けます (自動削除経路なし、 `spec/011_auth.md § 未決事項` の対象外)。
- 手動 cleanup =
  ```bash
  npx tsx -e 'import { PrismaClient } from "@prisma/client"; const p = new PrismaClient(); (async () => { const r = await p.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }); console.log(JSON.stringify(r)); await p.$disconnect(); })();'
  ```
- 定期 cleanup が必要な運用フェーズでは、 cron 経路 (別 Issue) で日次実行する。

## 監査ログ

- 標準出力に 1 行 JSON で出力される (`lib/log/audit.ts` の `logAudit`)。
- 認証成功 = `level=info`、 認証失敗 = `level=warn`、 サーバーエラー = `level=error`。
- 認証失敗ログには `email` を含めない (`spec/011_auth.md § 非機能要件`)。
- ログ集約基盤 (Datadog / Loki 等) に転送する場合は stdout を tail してパイプする経路が推奨。

例 (認証失敗)。

```json
{
  "timestamp": "2026-07-12T20:00:00.000Z",
  "level": "warn",
  "event": "auth.login",
  "actorId": null,
  "targetType": "user",
  "targetId": null,
  "status": 401,
  "errorCode": "invalid_credentials"
}
```

## トラブルシューティング

### ログインに成功するが直後の API 呼び出しで 401 が返る

- 原因 1 = Cookie が保存されていない。 レスポンスヘッダの `Set-Cookie: sid=...` を確認する。
- 原因 2 = ブラウザが `SameSite=Lax` で Cookie を拒否 (別ドメインからの遷移)。 同一 origin で開いているか確認する。
- 原因 3 = `HttpOnly` のため JS からは読めない。 これは仕様。
- 対処 = DevTools → Application → Cookies で `sid` の存在と `Domain` / `Path` を確認する。

### 「invalid_credentials」 が返る (パスワードは正しいはずなのに)

- 原因 1 = `email` の大文字小文字違いで別レコードを検索している。 実装では小文字化しているが、 seed で登録した `email` に大文字が含まれていないか確認する (デフォルトは全て小文字)。
- 原因 2 = パスワードハッシュのフォーマット違反 (旧形式のダンプを import した等)。 `passwordHash` が `s2$...$...$...$...$...` の形式であるかを確認。
- 対処 = 開発環境で該当ユーザーを削除して再登録する。

### migration が失敗する (既存 User が email なしで残っている)

- `20260712113001_add_auth_invite_permissions` migration は既存 User テーブルの `email` / `passwordHash` を NOT NULL で追加する。 既存レコードがある場合は失敗する。
- 開発では `rm prisma/dev.db && npx prisma migrate dev` でリセット + 再作成、 `npm run db:seed` で default ユーザーを投入する。
- 本番運用では data migration script を書いて既存 User に `email` を割り当てる (現行ハンズオンでは想定外)。

### Session が「期限切れではないのに 401」 になる

- 原因 = サーバー時刻が Cookie 発行時から進みすぎている (NTP ずれ)。
- 対処 = サーバーの `date` コマンドで確認、 NTP 同期を実施。

### seed で作った default user でログインできない

- 期待 = `email = "default@example.com"` / `password = "Default!123"`。
- `npm run db:seed` を再実行して console 出力の JSON を確認する (`loginPassword` field に平文が表示される)。
- DB がリセットされた場合は再度 seed する必要がある。

## セキュリティ考慮 (再掲)

- パスワードハッシュ = scrypt (依存追加なし、 適応型ハッシュ)。
- 認証失敗理由の露出防止 (`invalid_credentials` 統一)。
- Cookie は `HttpOnly` + `SameSite=Lax`、 本番は `Secure`。
- Session トークン (`sid`) は 32 byte crypto ランダム、 base64url 43 文字前後。
- ログに `email` / 平文 password / Cookie の値を残さない。

## 未対応 (`spec/011_auth.md § 未決事項`)

- パスワードリセット
- メール認証
- 2 要素認証
- レート制限
- OAuth / OIDC ソーシャルログイン
- ユーザー情報の更新 API
- ユーザー削除 API
