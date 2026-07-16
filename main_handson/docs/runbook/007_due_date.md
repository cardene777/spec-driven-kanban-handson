# 期限 運用 runbook

Simple Kanban のカード期限機能 (`Card.dueDate`、 日付単位) の運用手順とトラブルシューティング。

## 概要

- **保存形式** = `Card.dueDate` を `DateTime?` (Prisma / SQLite) で保存し、 時刻部分は `00:00:00.000Z` 固定。 API 層で `YYYY-MM-DD` 文字列 ↔ `DateTime` を変換する (`lib/dueDate/serialize.ts`)。
- **期限切れ判定** = pure 関数 `computeDueDateStatus(dueDate, today)` (`lib/dueDate/status.ts`)。 4 状態 = `none` / `future` / `today` / `overdue`。 `today` はサーバー UTC 日付 (`getServerTodayUtc()`)。 判定はレスポンスに含めず UI 側で行う。
- **権限** = 期限更新 (`PATCH /api/cards/{cardId}/due-date`) は `member` 以上。

## 障害シナリオと確認手順

### 期限を設定できない (422)

- `invalid_format` = `YYYY-MM-DD` 形式でない (スラッシュ / 時刻付き / ゼロパディングなし / 空文字)。 送信値を確認する。
- `invalid_date` = 形式は合うが実在しない日付 (`2026-02-30` 等)。 `lib/dueDate/validate.ts` の `isRealDate` が `new Date` 再構築で判定する。
- `invalid_type` = `dueDate` が文字列でも `null` でもない。
- `_ = required` = body 全体が空 (`dueDate` フィールド未指定)。 解除する場合は明示的に `{ "dueDate": null }` を送る。

### 「今日が期限」 / 「期限切れ」 の表示がずれる

- 判定の「本日」 はサーバー時刻の UTC 日付。 サーバー時刻が NTP でずれていると判定が 1 日ずれる。 サーバーの `date` コマンドで時刻を確認し、 NTP 同期を実施する。
- クライアントのタイムゾーンとサーバー UTC の差で、 UI 上の「今日」 が実際のローカル日付と 1 日ずれて見えることがある。 初期方針はサーバー UTC 日付を正とする (`spec/007_due_date.md § 境界条件`)。

## 監視項目 (監査ログ)

- 標準出力に 1 行 JSON で出力される。 成功は `level=info`、 `4xx` は `warn`、 `5xx` は `error`。
- イベント名は実装準拠のドット区切り = `card.due-date.update`。

例 (期限設定成功)。

```json
{
  "timestamp": "2026-07-16T09:00:00.000Z",
  "level": "info",
  "event": "card.due-date.update",
  "actorId": null,
  "targetType": "card",
  "targetId": "clx...card",
  "status": 200,
  "errorCode": null,
  "context": { "cardId": "clx...card" }
}
```

### 警告 (spec / design と実装の食い違い)

- **イベント名の表記が食い違う**。 `spec/007_due_date.md § 運用` はアンダースコア区切り (`card_due_date_update`) を記載するが、 実装はドット区切り (`card.due-date.update`) を出力する。 ログを grep / 集約する際はドット区切りを対象にする。
- **状態エラー (`422 invalid_state`) は発生しない**。 `spec/007_due_date.md` と `design/007_due_date.md` は `status != active` (アーカイブ / 削除済み) のカードへの期限更新を `422 invalid_state` で拒否すると定めるが、 本コードベースには `Card.status` 列 / アーカイブ機能 (`spec/004`) が未実装のため、 状態エラー分岐は存在しない。 期限更新はカードの状態にかかわらず (存在すれば) 成功する。 `invalid_state` のログ / エラーは出力されないため、 監視対象に含めない。

### 不足項目 (追跡に使えないフィールド)

- **`actorId` は常に `null`** = 誰が期限を設定 / 変更 / 解除したか (操作ユーザー) は監査ログから追跡できない。 route が `withApiHandler` に `actorId` を渡していないため (保留中の Critical)。
- **`boardId` と遷移前後の `dueDate` が記録されない** = `spec/007_due_date.md § 運用` は対象ボード識別子 (`boardId`)、 遷移前 `dueDate`、 遷移後 `dueDate` の記録を要求し、 `design` も `context={ boardId, oldDueDate, newDueDate }` を要求するが、 実装の `context` は `cardId` のみ。 「いつ、 どの日付から、 どの日付に変えたか」 の追跡はログからはできない。 期限誤設定の調査には別途 `Card.dueDate` の現在値と `Card.updatedAt` を DB で確認する。

## 関連ファイル

- 実装 = `app/api/cards/[cardId]/due-date/route.ts`
- 期限切れ判定 = `lib/dueDate/status.ts`
- シリアライズ = `lib/dueDate/serialize.ts`
- 日付検証 = `lib/dueDate/validate.ts`
- スキーマ = `lib/schemas/dueDate.ts`
- 監査ログ = `lib/log/audit.ts` / `lib/http/withApiHandler.ts`
- データモデル = `prisma/schema.prisma` (`Card.dueDate`、 `@@index([dueDate])`)
