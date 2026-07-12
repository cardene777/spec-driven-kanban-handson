# 期限機能の設計

## 関連仕様

- `constitution.md`
- `spec/000_shared_rules.md`
- `spec/003_cards.md`
- `spec/004_card_movement_archive_restore.md`
- `spec/005_card_detail.md`
- `spec/007_due_date.md`

## 前提

Prisma 全体スキーマ、 認証・認可の共通ユーティリティ (`getCurrentUser` / `assertBoardAccess`)、 エラーレスポンスヘルパ、 監査ログ形式、 バリデーション方針 (zod) は `design/001_boards.md § 共通設計方針` を参照する。 Card エンティティと `resolveBoardFromCard(cardId)` は `design/003_cards.md § データモデル` を参照する。 カード詳細モーダルの 6 領域構造は `design/005_card_detail.md § UI 構造` を参照する。 本 file は期限 (Due Date) 固有の設計のみ記述する。

`status` (`active` / `archived` / `deleted`) フィールドは `spec/004_card_movement_archive_restore.md § 対象データ` で定義されている。 本設計は `Card.status` が既に存在する前提で書く。

## データモデル

### Card モデルへの拡張

`design/003_cards.md § データモデル` の `Card` に `dueDate` を追加する。 `assigneeId` は `design/005_card_detail.md` で、 ラベル関連は `design/006_label.md` で追加済み。

```prisma
model Card {
  id          String    @id @default(cuid())
  listId      String
  title       String
  description String    @default("")
  order       Int
  assigneeId  String?
  dueDate     DateTime? // 追加。 日付のみ扱い、 時刻部分は 00:00:00 UTC 固定
  status      CardStatus @default(active) // spec/004 で定義済み
  archivedAt  DateTime?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  list        List      @relation(fields: [listId], references: [id], onDelete: Cascade)
  assignee    User?     @relation("CardAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  comments    Comment[]
  cardLabels  CardLabel[]

  @@unique([listId, order])
  @@index([listId])
  @@index([assigneeId])
  @@index([dueDate])
  @@index([status])
}
```

- `dueDate` は `DateTime?` (Prisma、 SQLite では ISO8601 文字列として保存)。
- 保存時は「日付部分のみ、 時刻は `00:00:00.000` UTC」 の DateTime として格納する (`spec/007_due_date.md § 対象データ`)。 例 = `2026-07-12` 入力なら `2026-07-12T00:00:00.000Z` として保存。
- `dueDate` に `@@index` を付与し、 期限絞り込みクエリ (`design/008_search_filter.md`) の性能を確保する。
- 期限の判定タイムゾーンはサーバー時刻の UTC 日付を用いる (`spec/007_due_date.md § 対象データ` の初期方針)。

### JSON 表現

Card レスポンスの拡張。

```json
{
  "id": "clx...",
  "listId": "clx...",
  "title": "buy milk",
  "description": "2 本",
  "order": 0,
  "assigneeId": "usr_abc",
  "dueDate": "2026-07-12",
  "status": "active",
  "createdAt": "2026-07-12T09:00:00.000Z",
  "updatedAt": "2026-07-12T09:00:00.000Z"
}
```

- API レスポンスの `dueDate` は `YYYY-MM-DD` 形式の文字列で返す (`spec/007_due_date.md § 対象データ`)。 内部の `DateTime` から `.toISOString().slice(0, 10)` で変換する。
- `dueDate` が `null` の場合は `"dueDate": null` を返す。

## API 設計

`spec/007_due_date.md § API` の 1 endpoint を Route Handler で実装する。 file 配置。

- `app/api/cards/[cardId]/due-date/route.ts` … `PATCH`

### `PATCH /api/cards/{cardId}/due-date` 期限更新

- 入力 = パスパラメータ `cardId`、 body = `{ dueDate: string | null }`。
- 権限 = 対象ボードの `member` 以上。
- バリデーション。
  - `dueDate` 文字列時 = `YYYY-MM-DD` 形式の正規表現 (`^\d{4}-\d{2}-\d{2}$`) にマッチ、 かつ日付として有効 (`new Date(dueDate + "T00:00:00.000Z")` が Invalid Date でない、 かつ `.toISOString().slice(0, 10) === dueDate`)。 失敗時は `422 { dueDate: "invalid_format" | "invalid_date" }`。
  - `dueDate` = `null` は解除として受理。
  - `dueDate` が文字列でも `null` でもない = `422 { dueDate: "invalid_type" }`。
  - body 全体が空 (dueDate フィールド未指定) = `422 { _: "required" }`。
- 処理。
  1. `card = resolveBoardFromCard(cardId)`、 未存在なら `404`。
  2. `assertBoardAccess(userId, card.list.boardId, "member")`。
  3. `card.status !== "active"` なら `422 { _: "invalid_state" }` を返す (`spec/007_due_date.md § アーカイブ済み / 削除済みカードの扱い`)。
  4. body を zod 検証。
  5. `dueDate` が文字列なら DateTime (`new Date(dueDate + "T00:00:00.000Z")`) に変換、 `null` ならそのまま。
  6. `prisma.card.update({ where: { id: cardId }, data: { dueDate: dueDateValue } })`。
- 出力 = `200 Card` (更新後、 `dueDate` は `YYYY-MM-DD` 文字列でシリアライズ)。
- ステータス = `200` / `401` / `403` / `404` / `422`。
- ログ = `event=card.due-date.update`、 `context={ cardId, boardId, oldDueDate, newDueDate }`。

### 期限切れ判定ロジック

期限切れ判定は「レンダリング時に UI 側で行う」 + 「必要なら API レスポンスに含める」 の 2 経路で実装する。

- pure 関数 `lib/dueDate/status.ts` に切り出す。

```typescript
type DueDateStatus = "none" | "future" | "today" | "overdue";

export function computeDueDateStatus(
  dueDate: string | null,
  today: string,
): DueDateStatus {
  if (dueDate === null) return "none";
  if (dueDate === today) return "today";
  if (dueDate > today) return "future";
  return "overdue";
}

export function getServerTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- 文字列比較 (`>` / `<`) は `YYYY-MM-DD` 形式なら辞書順 = 日付順で正しく動作する。
- API レスポンスに判定結果を含めるかは初期実装で**含めない**方針とする (`spec/007_due_date.md § 未決事項`)。 UI 側で `computeDueDateStatus(card.dueDate, getServerTodayUtc())` を呼ぶ。 判定タイミングのサーバー / クライアント時刻乖離は `spec/007_due_date.md § 境界条件` で「サーバー側の判定を正」 とするが、 初期実装ではクライアント側判定のみを採用する (単純化)。

### 既存 Card API との連携

- `GET /api/lists/{listId}/cards` / `GET /api/cards/{cardId}` のレスポンスに `dueDate` を含める (前述の JSON 表現)。
- `PATCH /api/cards/{cardId}` (title / description 更新) の zod schema には `dueDate` を含めない (専用 endpoint に分離)。
- 期限による絞り込みは `design/008_search_filter.md` で扱う。

## UI 構造

### 配置

- `design/005_card_detail.md § UI 構造` の `CardDetailModal` の期限領域に `CardDueDateField` を配置する。
- `design/003_cards.md § UI 構造` の `CardRow` に期限バッジ (`CardDueDateBadge`) を追加する。

### 主要 Client Component (追加分)

| コンポーネント | 責務 |
|---|---|
| `CardDueDateField` | 詳細モーダルの期限領域。 現在の期限表示、 状態別視覚区別、 変更 / 解除導線、 `<input type="date">` (or date picker、 `ui-design/`)。 `PATCH /api/cards/{cardId}/due-date` を叩く。 |
| `CardDueDateBadge` | カード行 (リスト内) の期限バッジ。 状態 (`future` / `today` / `overdue`) 別のスタイル。 `none` は非表示。 |
| `useDueDateStatus` | クライアント側 hook。 `computeDueDateStatus` を呼び、 状態を返す。 現在時刻の更新に対応するため `useEffect` で 1 分毎に再計算する (初期実装は開いた時のみ計算でも可、 `ui-design/`)。 |

### 状態表示

| 判定 | カード行バッジ | モーダル期限領域 | 例 (2026-07-12 が本日) |
|---|---|---|---|
| `none` (未設定) | 非表示 | 「期限を設定する」 導線のみ | `dueDate = null` |
| `future` (期限内) | 通常表現 (色: `ui-design/`) | 日付 + 通常表現 + 変更 / 解除導線 | `dueDate = 2026-07-15` |
| `today` (今日が期限) | 注意表現 (色: `ui-design/`) | 日付 + 注意表現 (「今日が期限」 バッジ) + 変更 / 解除導線 | `dueDate = 2026-07-12` |
| `overdue` (期限切れ) | 警告表現 (色: `ui-design/`) | 日付 + 警告表現 (「期限切れ」 バッジ) + 変更 / 解除導線 | `dueDate = 2026-07-10` |

- `status = archived` / `deleted` のカードは期限バッジ非表示、 モーダル期限領域は「編集不可」 状態 (`ui-design/`)。

### 楽観的更新

- 期限設定 / 変更 / 解除は楽観的更新を採用する。 UI 側で先に表示更新 → API 応答で確定、 失敗時ロールバック (`spec/007_due_date.md § 画面レベル`)。

## 状態遷移

### エンティティ状態

Card (期限フィールド)。

```
[dueDate=null]  --PATCH due-date (YYYY-MM-DD)-->  [dueDate=YYYY-MM-DD]
[dueDate=X]     --PATCH due-date (YYYY-MM-DD)-->  [dueDate=YYYY-MM-DD] (上書き)
[dueDate=X]     --PATCH due-date (null)-->        [dueDate=null]
[dueDate=X] + [status=archived] --PATCH due-date-->  [422 invalid_state] (状態変わらず)
[dueDate=X] + [status=deleted]  --PATCH due-date-->  [422 invalid_state] (状態変わらず)
[dueDate=X]  --archive (spec/004)-->  [dueDate=X, status=archived] (dueDate 保持)
[dueDate=X]  --restore (spec/004)-->  [dueDate=X, status=active] (dueDate 復活)
```

### 期限切れ判定の状態遷移 (時間経過)

```
未設定 (none)
   ↓ PATCH due-date=T+3
期限内 (future)  <-- 時間経過で今日が期限 (today) → 期限切れ (overdue)
   ↑ PATCH due-date=null                                   ↑ PATCH due-date=T+5
   期限解除                                                  期限再設定 (期限内へ)
```

- 判定はレンダリング時に純粋関数で行うため、 DB 側で状態遷移は追跡しない。

### UI 状態遷移 (期限領域)

```
モーダル open → CardDueDateField 初期化 (card.dueDate を Read)
→ idle (未設定 / 設定済み)
→ 変更 / 設定 → editing (date picker 開) → submitting → success → idle (新値)
                                                    ↘ error → rollback (旧値) + inline error
→ 解除 → confirming (任意) → submitting → success → idle (未設定)
                                       ↘ error → rollback + inline error
```

## 非機能の実装方針

### 性能

- `PATCH /api/cards/{cardId}/due-date` = 単一 update。 P95 300ms 以内。
- カード一覧 / 詳細レスポンスに `dueDate` を含めるコストは軽微 (単一カラム追加のみ、 JOIN 不要)。
- 期限絞り込みは `@@index([dueDate])` を追加することで、 `spec/008_search_filter.md` のクエリ性能を確保する。

### セキュリティ

- `spec/007_due_date.md § 期限切れ判定` のサーバー時刻依存を明示。 サーバー時刻の改竄はローカル環境前提のため対象外 (`constitution.md § セキュリティ`)。
- `dueDate` の日付検証は zod で正規表現 + 再構築検証 (`new Date(x + "T00:00:00.000Z").toISOString().slice(0, 10) === x`) を組み合わせ、 `2026-02-30` のような無効日付を確実に排除する。
- `PATCH /api/cards/{cardId}/due-date` の body は `dueDate` のみ受理し、 それ以外は `.strict()` で拒否する。

### 運用

- 期限設定 / 変更 / 解除の全操作を `context={ oldDueDate, newDueDate }` で記録する。 期限誤設定の追跡を可能にする。
- `status = archived` / `deleted` に対する期限更新試行 (`422 invalid_state`) は `warn` レベルで記録し、 UX 上のミスクリック傾向を追跡可能にする。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| `PATCH /api/cards/{cardId}/due-date` | `resolveBoardFromCard` → `assertBoardAccess(userId, boardId, "member")` + `card.status === "active"` 検証 | 未認証 `401`、 未存在 / 閲覧不可 `404`、 `viewer` は `403`、 `status !== active` は `422 invalid_state` |

- 期限を含む取得系 API (`GET /api/cards/{cardId}` / `GET /api/lists/{listId}/cards`) は既存の `viewer` 以上要件をそのまま継承する。

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| `card.due-date.update` 成功 (設定 / 変更) | `info` | `actorId`、 `targetId=cardId`、 `context={ boardId, oldDueDate, newDueDate }`、 `status=200` |
| `card.due-date.update` 成功 (解除) | `info` | 同上 (`newDueDate=null`)、 `status=200` |
| `card.due-date.update` の `422 invalid_state` | `warn` | `actorId`、 `targetId=cardId`、 `context={ boardId, currentStatus }`、 `status=422`、 `errorCode="validation_error"` |
| 全操作の `401` / `403` / `404` / `422` / `5xx` | `warn` / `warn` / `warn` / `warn` / `error` | `design/001_boards.md § 監査ログ` の共通形式 |

## テスト方針

### Vitest 構成 (Board / List / Card 設計と共通)

- 単体テスト … zod スキーマ (`dueDate` の `YYYY-MM-DD` 形式検証 + 実在日付検証)、 `computeDueDateStatus` pure 関数 (4 状態の判定)。
- Route Handler テスト … 独立 SQLite テスト DB。 `getCurrentUser` 差し替え。 `status = active / archived / deleted` の 3 パターンで挙動を検証。
- UI テスト … `CardDueDateBadge` の 4 状態表示、 `CardDueDateField` の楽観的更新 rollback (優先度中)。

### ケース一覧

| 種別 | ケース例 |
|---|---|
| 正常系 | `null → 2026-07-15` (設定)、 `2026-07-15 → 2026-07-20` (変更)、 `2026-07-15 → null` (解除)、 過去日付設定 (`1970-01-01` / `2020-01-01`)、 遠い未来 (`9999-12-31`) |
| 権限 | `viewer` で `PATCH due-date` = `403`、 未参加ボード = `404` |
| 未存在 | 存在しない `cardId` = `404` |
| バリデーション (形式) | `2026/07/12` (スラッシュ) / `2026-7-12` (ゼロパディングなし) / `2026-07-12T00:00:00Z` (時刻付き) / 空文字 = `422 invalid_format` |
| バリデーション (無効日付) | `2026-02-30` / `2025-04-31` / `2026-13-01` / `2026-00-01` = `422 invalid_date` |
| バリデーション (型) | `dueDate: 20260712` (数値) / `dueDate: true` / body 空 = `422 invalid_type` or `required` |
| 状態エラー | `status = archived` のカードに `PATCH due-date` = `422 invalid_state`。 `status = deleted` も同様 |
| 状態保持 | archive → dueDate 保持を確認、 restore で `dueDate` が復活 |
| 境界 | 本日 (`getServerTodayUtc()`) 設定 → `today` 判定、 昨日設定 → `overdue`、 明日設定 → `future`、 `1970-01-01` → `overdue`、 `9999-12-31` → `future` |
| pure 関数 | `computeDueDateStatus` の 4 状態網羅 (null / 同日 / 未来 / 過去) |
| API レスポンス | `dueDate` が `YYYY-MM-DD` 文字列 / `null` で返る、 内部の DateTime とシリアライズが一致 |

### 補助ヘルパ

- `tests/helpers/factories.ts` に `createCard` の `dueDate?` オプション追加。
- `tests/helpers/date.ts` に「本日 + N 日の `YYYY-MM-DD` 文字列」 を返す helper を用意し、 判定境界テストで再利用する。

## 実装方針 (本設計で固定する判断)

- `Card.dueDate` は Prisma の `DateTime?` として保存し、 時刻部分は `00:00:00.000 UTC` 固定とする。 API 層で `YYYY-MM-DD` 文字列 ↔ DateTime を変換する。 理由 = Prisma / SQLite の日付型に完全な `date-only` は無いため、 DateTime に統一しつつシリアライズで日付部分のみを露出させる。
- 期限切れ判定はサーバー UTC 日付を「本日」 として用いる (`spec/007_due_date.md § 対象データ` の初期方針)。 ユーザーローカルタイムゾーンへの拡張は未対応 (`spec/007_due_date.md § 未決事項`)。
- 期限切れ判定は API レスポンスに含めず、 UI 側で pure 関数 `computeDueDateStatus` を呼ぶ経路とする。 サーバー判定の一元化は初期実装で採用しない (単純化)。 将来ユーザータイムゾーン対応時に API レスポンスに含める形へ拡張する。
- `status !== "active"` に対する期限更新は `422 invalid_state` で拒否する (`spec/007_due_date.md § アーカイブ済み / 削除済みカードの扱い`)。 UI 側でも `status = active` 以外は編集導線を無効化する二重防御。
- 期限は単一日付のみ (時刻 / 期間 / 繰り返しは対象外)、 `PATCH` は上書き / 解除の 2 動作のみ。
- 期限バッジの色 / アイコン / 文言は本設計では固定せず `ui-design/` に委譲する。 状態識別子 (`future` / `today` / `overdue`) のみ本設計で固定する。

## 実装順序

1. **`design/001_boards.md` / `design/002_lists.md` / `design/003_cards.md` / `design/004_card_movement_archive_restore.md` の実装順序を先に完了させる**
   Board / List / Card の基本 CRUD と `status` フィールド (アーカイブ / 削除) が本設計の前提。
2. **Prisma スキーマ拡張と migration**
   `Card.dueDate` 追加 (`DateTime?`) と `@@index([dueDate])` 追加を 1 migration で流す。 既存 `status` / `assigneeId` / relation を破壊しないことを確認する。
   依存 = 手順 1。
3. **pure 関数と zod スキーマ**
   - `lib/dueDate/status.ts` の `computeDueDateStatus` / `getServerTodayUtc`。
   - `lib/dueDate/serialize.ts` の `DateTime ↔ YYYY-MM-DD` 変換 helper。
   - `schemas/dueDate.ts` の zod スキーマ (形式検証 + 実在日付検証)。
   - 全て pure 関数として単体テストする。
   依存 = 手順 2。
4. **API endpoint 1 本**
   `PATCH /api/cards/{cardId}/due-date` を実装する。 `status !== "active"` 判定を先に置き、 状態遷移エラーを早期に返す。
   依存 = 手順 3。
5. **既存 Card レスポンスへの `dueDate` 追加**
   `GET /api/cards/{cardId}` / `GET /api/lists/{listId}/cards` のレスポンスに `dueDate` を `YYYY-MM-DD` 文字列で含める。 serializer helper (手順 3) を経由。 既存テストで `dueDate` の存在を assert していない場合は追加する。
   依存 = 手順 4。
6. **UI コンポーネント**
   `CardDueDateBadge` (カード行 + モーダル共用) → `CardDueDateField` (詳細モーダル領域) → `CardRow` へのバッジ組込み、 の順で実装する。 状態別スタイルは `ui-design/` で決めた色 / アイコンを反映する。
   依存 = 手順 5。
7. **テスト整備**
   pure 単体テスト (手順 3、 4 状態網羅と日付検証境界) → Route Handler テスト (手順 4、 `status` 3 パターン + アーカイブ / 復元の `dueDate` 保持検証) → UI テスト (バッジ状態表示、 楽観的更新 rollback) の順で追加する。
   依存 = 手順 3〜6。
