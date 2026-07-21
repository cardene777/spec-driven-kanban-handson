# 期限の設計

## 関連仕様

- spec/007_due_date.md / spec/003_cards.md / spec/005_card_detail.md
- spec/000_shared_rules.md / constitution.md

## 前提

- design/001-004 の前提を継承する。
- **Card に `dueDate DateTime?` を新規追加する（未実装のため要 migration）**。日付のみ扱い、時刻は使わない。
- 認証・ロールは後続 auth 機能へ委譲（配置のみ、コア段階は通過）。

## 既存設計との差分

- **PATCH /api/cards/[cardId]**: design/003 の title/description/order に加えて `dueDate`（`YYYY-MM-DD` 文字列 or null）を受け付ける（加算的）。

## データモデル

```prisma
model Card {
  // 既存フィールドに追加
  dueDate DateTime?
}
```

- `dueDate` は日付のみを表す。保存は UTC 00:00:00 の DateTime（`new Date("YYYY-MM-DDT00:00:00.000Z")`）に正規化する。
- 応答では `YYYY-MM-DD`（または ISO 文字列）で返す。UI は日付として扱う。

## API設計

### PATCH /api/cards/[cardId] — 期限の設定・変更・解除（既存 PATCH を拡張）

- 入力: `{ title?, description?, order?, dueDate? }`。`dueDate` は `YYYY-MM-DD` 文字列 or `null`。
- 存在確認: Card なしは 404。
- 検証: `dueDate` が文字列のとき `YYYY-MM-DD` 形式かつ実在日付であること（不正は 422）。`null` は解除。省略時は変更しない。
- 処理: `dueDate` を正規化して更新（null はそのまま null）。
- 出力: 更新後 Card（`dueDate` 含む）/ 200。member 以上。ログ `card.setDueDate`。

## UI構造（画面状態）

- カード詳細モーダルの期限領域：日付表示 / 「期限なし」/ 期限切れ強調。date picker で設定・変更、解除ボタンで null 化。
- カード（列内）に期限バッジ（設定時）と期限切れ強調。
- 状態の所在: 編集中の日付はモーダルが保持、保存後に再取得。
- 期限切れ判定（本日より前）はサーバー/クライアントで日付比較。強調の色は `/ui-design` に委ねる。

## 状態遷移

- dueDate: 未設定(null) ⇄ 設定（日付）。設定日 < 本日 で「期限切れ」表示状態。

## 非機能の実装方針

### 性能

- 単一カード更新。P95 300ms 以内。

### セキュリティ

- 入力日付を検証し不正値を弾く。ローカル SQLite・機密なし。

### 運用

- 期限の設定・変更・解除を requestId 付きで操作ログに記録。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| PATCH /api/cards/[cardId]（dueDate） | 認証 → Card存在 → member → 日付検証 | 401 / 404 / 403 / 422 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| 期限設定/変更/解除 | info | requestId, card.setDueDate, cardId, dueDate |
| エラー応答 | error | requestId, ステータス, code, message |

## 実装方針

- 期限操作は既存 PATCH に統合し、専用エンドポイントは作らない（理由: 仕様が既存 PATCH 拡張を指定、他フィールドと併用可能）。
- 検証は `YYYY-MM-DD` 正規表現 + `Date` パースで実在日付を確認する共通関数 `validateDueDate`（lib/validation）に置く。
- 期限切れ判定はビジネスロジック（表示側）で行い、DB には日付のみ保存する。

## テスト方針

- Vitest、既存 mock に `dueDate` フィールドを追加。
- ケース: 設定（有効日付 200）、解除（null 200）、不正日付（`2026-13-40`/`abc` → 422）、存在なし 404、GET で dueDate 返却。

## 実装順序

1. Prisma に `dueDate` 追加 ＋ migration。
2. `validateDueDate` 追加、PATCH /api/cards/[cardId] に dueDate 対応。
3. UI（詳細モーダルの期限領域、カードの期限バッジ・期限切れ強調）接続。
4. テスト。

## 未決事項

- タイムゾーンの厳密化（現状 UTC 正規化 + 本日比較）。
