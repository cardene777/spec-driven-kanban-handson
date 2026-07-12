# 権限管理 運用 runbook

Simple Kanban の権限管理 (ボード単位の 3 ロール `owner` / `member` / `viewer`) の運用手順とトラブルシューティング。

## 概要

- **3 ロール** = `owner` (ボード編集 / 招待 / 権限変更 / 削除)、 `member` (書き込み系、閲覧)、 `viewer` (閲覧のみ)。
- **判定単位** = `BoardMembership.(boardId, userId)` 複合主キー。 1 ユーザー = 1 ボードあたり 1 ロール。
- **即時反映** = ロール変更 / 削除は認証 middleware がキャッシュを持たないため、次回 API 呼び出しから新ロールで判定される。
- **最後の owner 保護** = ボード内 owner が 1 名の状態で、その owner の 「role を owner 以外に変更」 / 「削除」 は禁止 (`422 last_owner`)。
- **判定関数** = `lib/permissions/lastOwner.ts` の `isLastOwnerProtected` (pure 関数)、 8 パターン単体テスト付き。

## 起動時の依存

- 認証機構 (`docs/runbook/011_auth.md`)。
- 追加 index (`BoardMembership.(boardId, role)`) は migration `20260712113001_add_auth_invite_permissions` で自動作成される。

## 権限マトリクス (再掲)

| 操作 | owner | member | viewer |
|---|---|---|---|
| ボード編集 (`PATCH /api/boards/{id}`) | ✓ | ✕ | ✕ |
| ボード削除 (`DELETE /api/boards/{id}`) | ✓ | ✕ | ✕ |
| リスト / カード / コメント CRUD | ✓ | ✓ | ✕ |
| 閲覧 (ボード / リスト / カード / コメント / メンバー) | ✓ | ✓ | ✓ |
| 招待 作成 / 再送 / 失効 / 一覧 | ✓ | ✕ | ✕ |
| メンバー ロール変更 (`PATCH /api/boards/{id}/members/{userId}`) | ✓ | ✕ | ✕ |
| メンバー 強制削除 (`DELETE /api/boards/{id}/members/{userId}`、他人対象) | ✓ | ✕ | ✕ |
| 自身の脱退 (`DELETE /api/boards/{id}/members/{userId}`、自分対象) | ✓ (最後 owner 除く) | ✓ | ✓ |

## トランザクション設計

- ロール変更 / 削除 API は Prisma `$transaction` (interactive) 内で以下を実行する。
  1. 対象 `BoardMembership` の存在確認
  2. `owner` 総数 count (`@@index([boardId, role])` で高速)
  3. `isLastOwnerProtected` 判定
  4. update / delete 実行
- SQLite は `BEGIN IMMEDIATE` で書き込みを直列化するため、 「最後の owner の同時降格」 レースは物理的に発生しない。

## 監査ログ

- `event=member.list` / `member.role_change` / `member.remove` を 1 行 JSON で標準出力に記録。
- ロール変更 = `context={ boardId, oldRole, newRole }`。 削除 = `context={ boardId, oldRole, selfRemoval }`。
- 最後 owner 保護発火 (`422 last_owner`) は `warn` レベルで記録する (発火頻度の監視に使う)。

例 (owner 降格 拒否)。

```json
{
  "timestamp": "2026-07-12T20:00:00.000Z",
  "level": "warn",
  "event": "member.role_change",
  "actorId": "usr_owner",
  "targetType": "member",
  "targetId": "usr_target",
  "status": 422,
  "errorCode": "validation_error",
  "context": {
    "boardId": "clx_board",
    "fields": { "role": "last_owner" }
  }
}
```

## 運用シナリオ

### owner を交代する (元 owner が抜ける)

1. `owner` が別ユーザー (member / viewer) のロールを `owner` に昇格する (`PATCH /api/boards/{id}/members/{userId}` body `{"role": "owner"}`)。
2. 昇格後、ボード内 owner が 2 名になった状態を確認する。
3. 元 owner のロールを `member` / `viewer` に降格するか、 owner のまま自身を脱退する。

### 特定メンバーの権限を落とす

1. `PATCH /api/boards/{id}/members/{userId}` body `{"role": "viewer"}`。
2. 変更後、対象ユーザーの以降の書き込み API は `403` を返す。

### メンバーの強制削除

1. `DELETE /api/boards/{id}/members/{userId}` を owner が実行。
2. 対象ユーザーは以降ボード配下の API を呼ぶと `404` が返る (存在露出防止)。
3. 対象ユーザーの過去投稿 (カード、コメント等) は削除されない (User テーブルは残る、 `BoardMembership` のみ削除)。

## トラブルシューティング

### 「最後の owner は降格 / 削除できません」 が出る

- 現在 owner が 1 名しかいない状態で降格 / 削除しようとしている。
- 対処 = 別ユーザーを先に owner に昇格し、 owner 総数を 2 名以上にしてから降格 / 削除する。

### ロール変更 API が `403` を返す

- 呼び出しユーザーが `owner` でない。 呼び出しユーザーのロールを確認する (`GET /api/boards/{id}/members` で自分の行を確認)。

### メンバー一覧 API が `404` を返す

- 呼び出しユーザーが対象ボードのメンバーでない (`viewer` 以上の `BoardMembership` を持たない)。 存在露出防止のため `404` を返す仕様。

### 削除後もキャッシュされたロールで動く

- 認証 middleware はキャッシュを持たない (毎リクエスト DB 引き)。 キャッシュ源は無い設計。
- 例外 = Server Component のレンダリング時点で取得したロールに基づく UI 表示は次回リフレッシュまで残る。 `router.refresh()` で最新化する。

### 自分の脱退で `422 last_owner` が返る

- 自分が唯一の owner で最後の owner。 別 owner を昇格してから再度実行する。

## セキュリティ考慮

- 対象 `userId` の存在は「ボードに参加しているか」 で判定する (User テーブル参照は行わない)。 未参加 = `404` (`BoardMembership` を持たない、 存在露出防止)。
- ロール変更 API のレスポンスに `email` / `name` を含めるため、 呼び出しユーザーが `owner` である前提を明示的に検証する。
- 削除 API の権限判定は 「本人 or owner」 の順で判定する。 別 endpoint (`/leave` 等) は用意しない。

## 未対応 (`spec/013_permissions.md § 未決事項`)

- ボード譲渡 (最後の owner が別ユーザーに owner を渡し、自身は member に降格する 1 API 経路)
- カスタムロール (`admin` / `guest`)
- ロール別の細分化制限 (member はコメントのみ可、 カード編集不可 等)
- ロール変更 / 削除の対象ユーザーへの通知 (メール / in-app)
- 監査ログの永続化 (現状は stdout への 1 行 JSON)
