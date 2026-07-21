# 検索と絞り込みの設計

## 関連仕様

- spec/008_search_filter.md / spec/003_cards.md / spec/004_card_movement_archive_restore.md / spec/006_label.md / spec/007_due_date.md
- spec/000_shared_rules.md / constitution.md

## 前提

- design/001-004 / 006 / 007 の前提を継承する（Card に dueDate、Label/CardLabel 追加済みを前提）。
- 追加のデータモデルはなし（既存を検索するのみ）。
- 認証・ロールは後続 auth 機能へ委譲（配置のみ、コア段階は通過）。
- 担当者・コメントは検索対象・絞り込み条件に含めない（spec/008）。

## データモデル

- 追加なし。検索は Card（+ CardLabel / dueDate / archivedAt / deletedAt）を対象。

## API設計

### GET /api/boards/[boardId]/search — カード検索・絞り込み

- 入力（すべて任意のクエリ）: `keyword`（0〜100）/ `labelId` / `due`（any|overdue|set|unset、既定 any）/ `status`（active|archived、既定 active）。
- 存在確認: Board なしは 404。
- 検証（422）: `keyword` 101文字以上 / `due` 未定義値 / `status` 未定義値。
- 処理: § データ取得・絞り込み手順。
- 出力: `{ items: Card[] }`（`listId`,`order` 昇順）/ 200。viewer 以上。

## データ取得・絞り込み手順

少量データ前提で、ボードのカードを取得してアプリ層で絞り込む（Prisma でアクセス、フィルタは JS）。

1. Board 存在確認。
2. ボードの List id 群を取得（listRepository.findByBoard）。
3. `card.findMany({ where: { listId: { in: ids }, deletedAt: null } })` で deleted を除外して取得。
4. アプリ層フィルタ:
   - status: `active` → archivedAt == null / `archived` → archivedAt != null。
   - due: `overdue` → dueDate != null かつ dueDate < 本日0時 / `set` → dueDate != null / `unset` → dueDate == null / `any` → 制限なし。
   - keyword: 空でなければ title/description に部分一致（ASCII は大文字小文字非依存。SQLite LIKE 既定に相当する挙動を JS の `toLowerCase().includes()` で実現）。
   - labelId: 指定時は CardLabel に (cardId,labelId) が存在するカードのみ（cardLabel を別途取得して判定）。
5. `listId`,`order` 昇順で並べて返す。

## UI構造（画面状態）

- ボード詳細の検索・絞り込みバー：キーワード入力、ラベル選択、期限セレクト（any/overdue/set/unset）、状態セレクト（active/archived）。
- 適用時は該当カードのみ表示、0 件は「該当するカードがありません」。
- 状態の所在: 検索条件はバーのクライアント状態。適用で API 呼び出し→結果表示。
- 部品階層は `/ui-design` に委ねる。

## 状態遷移

- UI: 検索バー 入力中 → 適用 → 結果表示（0件表示含む）→ 条件クリア。エンティティ状態遷移なし（読み取りのみ）。

## 非機能の実装方針

### 性能

- 少量データ前提。ボードのカードを一括取得後にアプリ層で絞り込むため、クエリは数回に収める。P95 200ms 以内。
- 大規模化時は DB 側フィルタ（`list: { boardId }` リレーション + `contains`）へ移行可能（本設計では小規模前提でアプリ層フィルタを採用）。

### セキュリティ

- boardId スコープ内のみ検索。deleted は常に除外。

### 運用

- 検索はエラーを requestId 付きで記録（操作ログは必須としない読み取り系）。

## 権限チェックの配置

| 対象 | チェック内容 | 失敗時 |
|---|---|---|
| GET /api/boards/[boardId]/search | 認証 → Board存在 → viewer以上 → クエリ検証 | 401 / 404 / (権限なし)404 / 422 |

## 監査ログ

| 操作 | ログレベル | 記録する項目 |
|---|---|---|
| 検索エラー | error | requestId, ステータス, code, message |

## 実装方針

- **キーワードの大文字小文字非依存は ASCII 範囲**を、アプリ層 `toLowerCase().includes()` で実現する（理由: Prisma の `mode:'insensitive'` は SQLite 非対応。DB 依存機能を固定判断に含めない）。
- **絞り込みはアプリ層**で行う（理由: 小規模データで十分・テスト容易。大規模化時は DB 側へ移行）。
- ラベル絞り込みは単一 `labelId`。存在しない labelId は 404 ではなく結果 0 件（spec/008）。

## テスト方針

- Vitest、既存 mock（card/cardLabel/list、`in` 演算子）を利用。
- ケース: keyword 部分一致・空で全件、labelId 絞り込み、due=overdue/set/unset、status=active/archived（deleted 除外）、0 件、keyword 101文字 422、due/status 不正値 422、board なし 404。

## 実装順序

1. design/006・007 のモデル追加後に着手（依存）。
2. `searchRepository`（または cardRepository.search）でボードカード取得＋アプリ層フィルタ。
3. GET /api/boards/[boardId]/search 追加。
4. UI（検索・絞り込みバー）接続。
5. テスト。

## 未決事項

- 複数ラベル指定（AND/OR）・DB 側フィルタ移行は将来要件。
