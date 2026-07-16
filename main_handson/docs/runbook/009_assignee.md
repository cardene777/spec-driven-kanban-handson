# 担当者 運用 runbook

Simple Kanban の担当者割り当て機能 (`CardAssignee` 中間テーブル、 最大 10 名) の運用手順とトラブルシューティング。

## 概要

- **データモデル** = `CardAssignee` (複合主キー `(cardId, userId)`、 `onDelete: Cascade`)。 実装 = `prisma/schema.prisma`。
- **上限** = 1 カード 10 名 (`ASSIGNEES_MAX` = `lib/assignees/limit.ts`)。 超過は `422 assignees_limit_exceeded`。
- **重複** = 複合主キーで DB レベル拒否。 アプリ層では事前 count と `P2002` 捕捉の二重で `409 already_assigned` に変換する。
- **権限** = 一覧取得は `viewer` 以上、 追加 / 削除は `member` 以上 (`lib/assignees/permission.ts` の `canManageAssignees`)。

## 障害シナリオと確認手順

### 担当者を追加できない (422 / 409 が返る)

- `422 assignee_not_found` = 指定 `userId` が User テーブルに存在しない。 DB で該当ユーザーの存在を確認する。
- `422 assignee_not_in_board` = 指定ユーザーが対象ボードの `BoardMembership` に存在しない (`viewer` 以上でない)。 メンバー招待 (`docs/runbook/012_member_invite.md`) を先に完了させる。
- `422 assignees_limit_exceeded` = 既に 10 名割当済み。 一覧を確認し、不要な担当者を解除してから追加する。
- `409 already_assigned` = 指定ユーザーが既に担当者。 一覧を再取得して最新状態に整合させる。

### 担当者を追加 / 削除したのにカードの更新日時が変わらない

- 追加 / 削除は 1 トランザクション内で `cardAssignee` の変更と `card.update({ data: {} })` (空更新) を実行し、 `Card.updatedAt` を明示更新する。 `updatedAt` が変わらない場合はトランザクションが失敗している可能性があるため、 監査ログの `level=error` を確認する。

### ユーザー削除後に担当者が残っている

- `CardAssignee` は User に対して `onDelete: Cascade`。 User を物理削除すれば担当関係も自動で消える。 ボードメンバーから外れた (BoardMembership 消滅) だけのケースは自動クリーンアップの対象外で、 担当関係は保持される (`spec/009_assignee.md § 未決事項`)。

## 監視項目 (監査ログ)

- 標準出力に 1 行 JSON で出力される (`lib/log/audit.ts` の `logAudit`)。 追加 / 削除成功は `level=info`、 `4xx` は `warn`、 `5xx` は `error`。
- イベント名は実装準拠のドット区切り = `card.assignee.list` / `card.assignee.add` / `card.assignee.remove`。

例 (担当者追加成功)。

```json
{
  "timestamp": "2026-07-16T09:00:00.000Z",
  "level": "info",
  "event": "card.assignee.add",
  "actorId": null,
  "targetType": "card",
  "targetId": "clx...card",
  "status": 201,
  "errorCode": null,
  "context": { "cardId": "clx...card" }
}
```

### 警告 (spec / design と実装の食い違い)

- **イベント名の表記が食い違う**。 `spec/009_assignee.md § 運用` はアンダースコア区切り (`card_assignee_add` / `card_assignee_remove`) を記載するが、 実装はドット区切り (`card.assignee.add` / `card.assignee.remove`) を出力する。 ログを grep / 集約する際はドット区切りを対象にする。

### 不足項目 (追跡に使えないフィールド)

- **`actorId` は常に `null`** = 誰が担当者を追加 / 削除したか (操作ユーザー) は監査ログから追跡できない。 3 route いずれも `withApiHandler` に `actorId` を渡していないため。 「誰が」 の追跡が必要な場合は、 route に `actorId` を渡す実装修正が必要 (保留中の Critical)。
- **`boardId` が記録されない** = 追加 / 削除ログの `context` は `cardId` (削除は `cardId` + `userId`) のみで `boardId` を含まない。 ボード単位でのログ絞り込みはできない。 `cardId` からボードを引くには別途 `Card → List → boardId` の逆引きが必要。
- **`add` の `context` に担当対象 `userId` が含まれない** = 追加ログは `context={ cardId }` のみ (削除ログは `userId` を含む)。 「どのユーザーを追加したか」 は追加ログ単体からは分からない。

つまり監査ログを「actorId で追跡」 「boardId で追跡」 することは現状できない。 追跡は `targetId` (= `cardId`) と `event` を軸に行う。

## 関連ファイル

- 実装 = `app/api/cards/[cardId]/assignees/route.ts` / `app/api/cards/[cardId]/assignees/[userId]/route.ts`
- 上限判定 = `lib/assignees/limit.ts`
- 権限判定 = `lib/assignees/permission.ts`
- スキーマ = `lib/schemas/assignees.ts`
- 監査ログ = `lib/log/audit.ts` / `lib/http/withApiHandler.ts`
- データモデル = `prisma/schema.prisma` (`CardAssignee`)
