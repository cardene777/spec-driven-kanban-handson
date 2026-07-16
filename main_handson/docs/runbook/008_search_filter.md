# 検索・絞り込み 運用 runbook

Simple Kanban のカード検索・絞り込み機能 (`GET /api/boards/{boardId}/cards/search`) の運用手順とトラブルシューティング。

## 概要

- **クエリ組立て** = pure 関数 `buildCardWhere` (`lib/search/cardWhere.ts`) が検証済みパラメータを Prisma `CardWhereInput` に変換する。 全条件は AND 合成。
- **キーワード検索** = `title` / `description` / `Comment.body` の部分一致 (SQL の `LIKE '%...%'`)。 空白区切りの複数キーワードは AND、 各キーワード内は 3 フィールドの OR。
- **絞り込み** = ラベル (OR / none) / 期限 (5 種の排他) / 担当者 (3 種の排他) / ステータス。
- **並び順** = `updatedAt` 降順、 同時刻は `id` 昇順。 ページネーションなし (全件返却)。
- **権限** = `viewer` 以上で共通 (`member` / `owner` に追加権限なし)。

## 障害シナリオと確認手順

### 検索が 422 で失敗する

- `q` が 101 文字以上 = `q too_long`。 検索バーの入力上限 (100 文字) を確認する。
- 排他条件違反 = `invalid_labels_options` (ラベル指定と「ラベルなし」 の同時) / `invalid_due_date_options` (期限オプション 2 種以上) / `invalid_assignee_options` (担当者オプション 2 種以上)。 フィルタ UI で 1 種類のみ選択させる。
- `invalid_labels` = 別ボード所属 / 存在しないラベル ID を含む。 対象ボードのラベル一覧と照合する。
- `invalid_range` = `dueDateFrom > dueDateTo`。 期間の前後関係を確認する。

### 期待したカードが検索に出てこない

- キーワードの大文字小文字非依存は英数字のみ保証される (`§ 警告` 参照)。 日本語で大文字小文字 / 全半角違いがヒットしない場合は本挙動が原因。
- 期限の範囲は両端を含む。 「7 日以内」 は本日から本日 + 6 日まで。 期限未設定 (`dueDate = null`) のカードは、 期間指定 (`dueDateFrom` / `dueDateTo`) では除外される。
- 存在しない担当者 ID を `assigneeIds` に含めてもエラーにならず結果 0 件になる (存在有無を漏らさない)。

### アーカイブ / 削除済みを検索したいのに結果が 0 件

- `§ 不足項目` 参照。 `status = archived` / `deleted` はバリデーション上受理されるが、 常に 0 件を返す (status 列が未実装のため)。 これは既知の制約であり障害ではない。

## 監視項目 (監査ログ)

- **検索成功時 (`200`) はログを記録しない** (閲覧操作扱い、 `spec/008_search_filter.md § 運用`)。
- エラー時 (`401` / `404` / `422` / `5xx`) のみ `withApiHandler` 経由で `event=card.search` として記録される。 `4xx` は `level=warn`、 `5xx` は `level=error`。

例 (バリデーション失敗)。

```json
{
  "timestamp": "2026-07-16T09:00:00.000Z",
  "level": "warn",
  "event": "card.search",
  "actorId": null,
  "targetType": "board",
  "targetId": "clx...board",
  "status": 422,
  "errorCode": "validation_error",
  "context": { "boardId": "clx...board", "fields": { "q": "too_long" } }
}
```

### 警告 (spec / design と実装の食い違い)

- **キーワードの大小非依存は `LIKE` 依存**。 `design/008_search_filter.md` は `mode: "insensitive"` を前提とするが、 SQLite provider では非対応のため実装は素の `contains` (`LIKE`) を使う。 ASCII は既定で大小非依存、 非 ASCII (日本語) は SQLite の既定挙動に依存し保証されない (`lib/search/cardWhere.ts` の実装コメント参照)。
- **担当者絞り込みは `CardAssignee` 多対多経由**。 spec / design 008 は単一 `Card.assigneeId` 前提で記述するが、 担当者は `spec/009_assignee.md` で複数担当者モデルに刷新済み。 実装は `assignees.some` / `assignees.none` で合成する (結果セマンティクスは同等)。

### 不足項目

- **`status = archived` / `deleted` は常に結果 0 件**。 `Card.status` 列 / アーカイブ機能 (`spec/004`) が未実装のため、 `buildCardWhere` は `status != active` のとき `id: { in: [] }` の条件を積む。 受入条件「アーカイブ済み / 削除済みカードが返る」 は status 列が実装されるまで満たせない。
- **エラーログの `context` に `qLength` / `errorFields` が個別に含まれない**。 `design/008_search_filter.md § 監査ログ` は `qLength` 等の記録を要求するが、 実装の `context` は `boardId` (+ バリデーション失敗時の `fields`) のみ。 `actorId` も常に `null` のため、 誰の検索がエラーになったかは追跡できない。

## 関連ファイル

- 実装 = `app/api/boards/[boardId]/cards/search/route.ts`
- クエリ組立て = `lib/search/cardWhere.ts`
- クエリ解析 (transform) = `lib/search/params.ts`
- スキーマ = `lib/schemas/cardSearch.ts`
- 日付検証 = `lib/dueDate/validate.ts` / シリアライズ = `lib/dueDate/serialize.ts`
- 監査ログ = `lib/log/audit.ts` / `lib/http/withApiHandler.ts`
