# TDD サイクル記録 — 担当者（Assignee）

対象: spec/009_assignee.md / design/009_assignee.md
テスト実行コマンド: `npm test`（vitest run。include: `tests/**/*.test.ts`）
本章スコープ: 外部依存を持たない純粋関数（FR-004 / FR-005）のみ。API/DB/認証/UI は対象外。

## Red（このサイクルで作成した失敗テスト）

### FR-004: 担当者入力のバリデーション
- テスト: `tests/schemas/assignees.test.ts`
- 対象実装（未実装・/implement で作成）: `lib/schemas/assignees.ts` → `isValidAssigneeUserId(userId: unknown): boolean`
- 対象受入条件:
  - userId が1文字以上の文字列 → true
  - 空文字 "" → false
  - 空白のみ（"   " / "\t\n"）→ false
  - 非文字列（number/null/undefined/object/array/boolean）→ false
- 失敗理由（Red）: `Cannot find package '@/lib/schemas/assignees'`（対象モジュール未実装）。

### FR-005: 担当者数の上限判定
- テスト: `tests/assignees/limit.test.ts`
- 対象実装（未実装・/implement で作成）: `lib/assignees/limit.ts` → `MAX_ASSIGNEES = 10`、`canAddAssignee(currentCount: number): boolean`
- 対象受入条件:
  - MAX_ASSIGNEES === 10
  - 0 → true（境界下限）
  - 9 → true
  - 10 → false
  - 11 → false
  - 負数 -1 / 非整数 1.5 → false
- 失敗理由（Red）: `Cannot find package '@/lib/assignees/limit'`（対象モジュール未実装）。

## FAIL 確認
- `npx vitest run tests/schemas/assignees.test.ts tests/assignees/limit.test.ts`
- 結果: Test Files 2 failed（2）。両ファイルとも対象モジュール未実装で FAIL。設定不備・importパス誤りではない（`@/*` は vitest.config の alias でルート解決。パスは design で固定した実装先と一致）。

## /implement への引き継ぎ（Green → Refactor）
- 作成対象: `lib/schemas/assignees.ts`、`lib/assignees/limit.ts` のみ。
- 既存テスト（tests/api/kanban.test.ts の 20 件）を壊さないこと。
- テスト側は書き換えない。実装で PASS させる。

## 統合テストの前提（後続・本章対象外）
- FR-001/002/003（追加・削除・一覧）の統合テストには次が必要:
  - 実 DB（Prisma）または in-memory prisma mock の拡張（CardAssignee テーブル、`@@unique([cardId,userId])`）。
  - 認証モック（currentUser）とボードメンバー判定（BoardMembership、後続 auth 機能で確定）。
  - 検証項目: 201 追加 / 409 重複 / 422 非メンバー・上限超過 / 404 存在なし / 401・403 権限 / `{ items: [] }`。
- 現ハーネス（純粋関数の単体テスト）では上記は検証不能。純粋関数の PASS だけで機能実装済みとはしない。
