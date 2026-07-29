# カード詳細の設計

## 関連仕様

- spec/005_card_detail.md / spec/003_cards.md / spec/006_label.md / spec/007_due_date.md
- spec/000_shared_rules.md / constitution.md

## 前提

- design/001-004 の前提（技術スタック・共通規則・認証未接続）を継承する。
- 本設計は取得の集約点。ラベル（design/006）・期限（design/007）で追加するフィールドをレスポンスにまとめる。
- 認証・ロールは後続 auth 機能へ委譲（配置のみ、コア段階は通過）。

## 既存設計との差分

- **GET /api/cards/[cardId]**: design/003 では素の Card を返すが、本設計で `labels`（付与ラベル配列）と `dueDate` を含む形へ拡張する（加算的、既存フィールドは維持）。

## データモデル

- 追加なし（Card は design/007 で `dueDate` 追加、Label/CardLabel は design/006 で追加）。本設計はそれらを結合して返す。

## API設計

### GET /api/cards/[cardId] — カード詳細取得

- 入力: パス `cardId`。
- 存在確認: Card なしは 404。
- 処理: Card を取得し、`CardLabel` 経由で付与ラベル `labels: Label[]` を、`dueDate` を含めて返す。
- 出力: `{ ...card, dueDate, labels }` / 200。
- 権限: viewer 以上。ログ: エラー時のみ requestId 付き。

## UI構造（画面状態）

- カード詳細モーダル（ボード詳細上）。領域: タイトル / 説明文 / ラベル / 期限 / 操作（アーカイブ・削除・保存・閉じる）。
- 状態の所在: モーダルの開閉・編集中値はモーダルコンポーネントが保持。保存後は再取得（router.refresh）で反映。
- 画面状態: モーダル 閉⇄開、タイトル/説明 表示⇄編集、ラベル選択パネル 閉⇄開、期限 表示⇄編集。
- 部品階層は `/ui-design`（design/005_008_ui_features_ui.md）に委ねる。

## 状態遷移

- UI: モーダル 閉→開（カードクリック）→閉（閉じる/保存後）。エンティティ状態遷移は 003/004/006/007 に従う。

## 非機能の実装方針

### 性能

- 詳細取得はcard 1件、cardLabel、labelのクエリで行う。少量データを前提に、応答時間は200ms以内とする。

### セキュリティ

- ローカル SQLite・機密なし。取得のみ。

### 運用

- エラーは requestId 付きで記録（lib/audit/log）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET /api/cards/[cardId] | 認証 → Card存在 → viewer以上 | 401 / 404 / (権限なし)404 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| 取得エラー | error | requestId, ステータス, code, message |

## 実装方針

- 付与ラベルは `CardLabel` を介して結合して返す（labels は Label の配列）。空なら `[]`。
- `dueDate` 未設定は null。既存の GET 応答フィールドは維持し、`labels`/`dueDate` を追加するのみ。

## テスト方針

- Vitest、既存 in-memory mock を拡張（label / cardLabel テーブル、`in` 演算子）。
- ケース: labels あり/空配列、dueDate あり/null、存在しない cardId → 404。

## 実装順序

1. design/006（Label/CardLabel）・design/007（dueDate）のモデル追加後に着手。理由: 依存フィールド。
2. GET /api/cards/[cardId] 拡張（labels/dueDate 集約）。
3. カード詳細モーダル UI 接続（ui-design 反映後）。
4. テスト。

## 未決事項

- 担当者・コメント表示は後続。
