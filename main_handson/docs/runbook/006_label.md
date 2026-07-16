# ラベル 運用 runbook

Simple Kanban のラベル機能 (`Label` / `CardLabel` 中間テーブル、 8 色固定) の運用手順とトラブルシューティング。

## 概要

- **データモデル** = `Label` (`@@unique([boardId, name])`)、 `CardLabel` (複合主キー `(cardId, labelId)`、 `onDelete: Cascade`)。 実装 = `prisma/schema.prisma`。
- **色** = Prisma enum `LabelColor` の 8 色固定 (`red` / `orange` / `yellow` / `green` / `blue` / `purple` / `pink` / `gray`)。 SSOT = `lib/labels/colors.ts`。 API 層 (zod) と DB 層 (enum) の二重防御。
- **名前の一意性** = 同一ボード内で `name` 重複不可 (`@@unique([boardId, name])`)。 大文字小文字は区別する (SQLite 既定)。
- **権限** = 一覧取得は `viewer` 以上、 作成 / 編集 / 削除 / 付与 / 解除は `member` 以上。

## 障害シナリオと確認手順

### ラベルを作成 / 編集できない (422 duplicate_name)

- 同一ボード内に同名ラベルが既に存在する。 `GET /api/boards/{boardId}/labels` で一覧を確認する。 大文字小文字違い (`Bug` と `bug`) は別名として共存できる点に注意。
- Prisma の一意制約違反 (`P2002`) を `lib/http/prismaErrors.ts` の `isUniqueConstraintError` で捕捉し `422 duplicate_name` に変換している。

### ラベル削除後もカードにバッジが残って見える

- `CardLabel` は Label に対して `onDelete: Cascade`。 Label を削除すれば付与関連は DB 上で自動消去される。 UI に残る場合はカード側の再取得漏れ (楽観的更新のロールバック / キャッシュ) を疑う。
- DB 上の解除を確認するには `CardLabel` を `labelId` で SELECT し 0 件になっているか確認する。

### 別ボードのラベルをカードに付けられない (404)

- ラベルの付与 / 解除は「カードと同一ボードのラベル」 のみ許可する。 別ボードのラベル ID を指定すると `404` を返す (存在有無を漏らさないため、 権限エラーではなく `404`)。

## 監視項目 (監査ログ)

- 標準出力に 1 行 JSON で出力される。 成功は `level=info`、 `4xx` は `warn`、 `5xx` は `error`。
- イベント名は実装準拠のドット区切り = `label.list` / `label.create` / `label.update` / `label.delete` / `card.label.list` / `card.label.attach` / `card.label.detach`。

例 (ラベル作成成功)。

```json
{
  "timestamp": "2026-07-16T09:00:00.000Z",
  "level": "info",
  "event": "label.create",
  "actorId": null,
  "targetType": "board",
  "targetId": "clx...board",
  "status": 201,
  "errorCode": null,
  "context": { "boardId": "clx...board" }
}
```

### 警告 (spec / design と実装の食い違い)

- **イベント名の表記が食い違う**。 `spec/006_label.md § 運用` はアンダースコア区切り (`label_create` / `label_update` / `label_delete` / `label_attach` / `label_detach`) を記載するが、 実装はドット区切りを出力する。 ログを grep / 集約する際はドット区切りを対象にする。

### 不足項目 (追跡に使えないフィールド)

- **`actorId` は常に `null`** = 誰がラベルを作成 / 編集 / 削除 / 付与 / 解除したか (操作ユーザー) は監査ログから追跡できない。 7 route いずれも `withApiHandler` に `actorId` を渡していないため (保留中の Critical)。
- **`boardId` はボード配下ラベル API 以外で記録されない** = `label.list` / `label.create` の `context` は `boardId` を含むが、 `label.update` / `label.delete` は `context={ labelId }` のみ、 `card.label.*` は `context={ cardId }` (付与 / 解除は `labelId` も) のみで `boardId` を含まない。 ボード単位のログ絞り込みはこれらの操作では現状できない。
- **削除時のカスケード件数 (`deletedCardLabelCount`) が記録されない** = `spec/006_label.md § 運用` は削除で解除された `CardLabel` 件数の記録を要求するが、 `label.delete` の `context` は `labelId` のみで件数を含まない。 削除の影響範囲 (何枚のカードから外れたか) はログから分からない。 影響範囲を確認するには削除前に `CardLabel` を `labelId` で COUNT する必要がある。

## 関連ファイル

- 実装 = `app/api/boards/[boardId]/labels/route.ts` / `app/api/labels/[labelId]/route.ts` / `app/api/cards/[cardId]/labels/route.ts` / `app/api/cards/[cardId]/labels/[labelId]/route.ts`
- 色定義 = `lib/labels/colors.ts`
- スキーマ = `lib/schemas/labels.ts`
- 一意制約変換 = `lib/http/prismaErrors.ts`
- 監査ログ = `lib/log/audit.ts` / `lib/http/withApiHandler.ts`
- データモデル = `prisma/schema.prisma` (`Label` / `CardLabel` / enum `LabelColor`)
