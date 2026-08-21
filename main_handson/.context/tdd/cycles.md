# TDD サイクル記録 — 担当者（Assignee）

対象: spec/009_assignee.md / design/009_assignee.md
テスト実行コマンド: `npm test`（vitest run。vitest.config.ts の include: `tests/**/*.test.ts`）
本サイクルのスコープ: 外部依存を持たない純粋関数のみ。
- FR-004: `userId` が文字列であり、前後の空白を除いた後に1文字以上あるか（`isValidAssigneeUserId`）
- FR-005: 担当者として追加できる人数の上限判定（`canAddAssignee` / `MAX_ASSIGNEES`）

Route Handler・DB更新・認証/権限・画面表示は対象外（後続の統合実装。末尾「統合テストの前提」参照）。

## Red（このサイクルで作成した失敗テスト）

### FR-004: 担当者入力のバリデーション
- テストファイル: `tests/schemas/assignees.test.ts`
- 対象実装（未実装・`/implement` で作成）: `lib/schemas/assignees.ts` → `export function isValidAssigneeUserId(userId: unknown): boolean`
- 書いたテストケース:
  - `describe("isValidAssigneeUserId (FR-004)")`
    - 1文字以上の文字列（`"u1"` `"a"`）→ true
    - 空文字 `""` → false
    - 前後の空白を除くと空になる文字列（`"   "` `"\t\n"`）→ false
    - 前後に空白があっても中身が残れば妥当（`"  u1  "` `"\tu1\n"`）→ true（trim 後に1文字以上、という受入条件の核心）
    - 非文字列（`123` `null` `undefined` `{}` `["u1"]` `true`）→ false
- 対応する受入条件（spec/009_assignee.md § 受入条件）:
  - 「`userId` が空文字のとき、担当者入力バリデーションは不正（false）を返す（FR-004）」
  - 「`userId` が非文字列（number/null/undefined等）のとき、バリデーションは不正を返す（FR-004）」
  - 「`userId` が1文字以上の文字列のとき、バリデーションは妥当（true）を返す（FR-004）」
  - design/009_assignee.md § 純粋関数の契約: 妥当=`typeof === "string" && trim().length > 0`、不正=空文字・空白のみ・非文字列
- FAIL理由（Red）: `Error: Cannot find module '@/lib/schemas/assignees' imported from '.../tests/schemas/assignees.test.ts'`（対象モジュール未実装。`lib/schemas/` ディレクトリ自体は存在するが `assignees.ts` が無い）。

### FR-005: 担当者数の上限判定
- テストファイル: `tests/assignees/limit.test.ts`
- 対象実装（未実装・`/implement` で作成）: `lib/assignees/limit.ts` → `export const MAX_ASSIGNEES = 10`、`export function canAddAssignee(currentCount: number): boolean`
- 書いたテストケース:
  - `describe("canAddAssignee (FR-005)")`
    - `MAX_ASSIGNEES` は 10
    - 現在0人 → true（境界下限）
    - 現在9人 → true
    - 現在10人 → false（上限）
    - 現在11人（上限超過）→ false
    - 負数・非整数（`-1` `1.5`）→ false
- 対応する受入条件（spec/009_assignee.md § 受入条件）:
  - 「現在の担当者数が 9 のとき、上限判定は追加を許可する（FR-005）」
  - 「現在の担当者数が 10 のとき、上限判定は追加を拒否する（FR-005）」
  - 「現在の担当者数が 0 のとき、上限判定は追加を許可する（FR-005、境界下限）」
  - design/009_assignee.md § 純粋関数の契約: 許可=0以上の整数かつ `currentCount < MAX_ASSIGNEES`、拒否=`currentCount >= MAX_ASSIGNEES` および負数・非整数
- FAIL理由（Red）: `Error: Cannot find module '@/lib/assignees/limit' imported from '.../tests/assignees/limit.test.ts'`（対象モジュール未実装。`lib/assignees/` ディレクトリは存在するが空、`limit.ts` が無い）。

## FAIL確認の手順と結果

1. `npx vitest run tests/schemas/assignees.test.ts tests/assignees/limit.test.ts`
   → `Test Files 2 failed (2)` / `Tests no tests`。両ファイルとも `Cannot find module` で collect 段階から失敗。
2. アライアス（`@/*`）自体の健全性を切り分けるため、既存の `@/lib/schemas/cards` を使う `tests/schemas/cards.test.ts` と `@/lib/auth/passwordStrength` を使う `tests/auth/passwordStrength.test.ts` を実行 → 両方 PASS（計16 tests）。`vitest.config.ts` の `resolve.alias["@"]` はリポジトリルートに正しく解決されており、設定・alias・import パスの誤りではないことを確認した。
3. `npm test`（フルスイート）→ 既存4ファイル・90 testsはすべてPASSし、新規2ファイルだけがFAILした。既存挙動への影響はない。

結論: 2ファイルの FAIL はいずれも対象モジュール（`lib/schemas/assignees.ts` / `lib/assignees/limit.ts`）が未実装であることによるものであり、Red として妥当。

## `/implement` への引き継ぎ（Green → Refactor）

- 作成対象はこの2ファイルのみ:
  - `lib/schemas/assignees.ts` → `isValidAssigneeUserId(userId: unknown): boolean`
  - `lib/assignees/limit.ts` → `MAX_ASSIGNEES = 10`、`canAddAssignee(currentCount: number): boolean`
- シグネチャ・配置は design/009_assignee.md § 純粋関数の契約 に固定済み。zod は使わず、副作用のない boolean 返却の純粋関数として実装する（既存 `lib/schemas/*.ts` の zod + ValidationError throw パターンとは異なる。design で明示的にシグネチャ固定されているため踏襲しない）。
- テスト側（`tests/schemas/assignees.test.ts` / `tests/assignees/limit.test.ts`）は書き換えない。実装側で PASS させる。
- Green確認後、既存90 testsが壊れていないことも確認する。

## Greenの実行結果

- `lib/schemas/assignees.ts`に、非文字列を拒否してから`trim()`後の長さを判定する逐次的なガード節を実装した。
- `lib/assignees/limit.ts`に`MAX_ASSIGNEES = 10`を定義し、非整数と負数を別々のガード節で拒否してから上限を判定した。
- `/tdd`が作成した2テストファイルは変更していない。
- 対象2ファイル・11 tests、全6ファイル・101 tests、lint、typecheck、buildがすべて成功した。

## Refactorの実行結果

- `isValidAssigneeUserId`の文字列判定と`trim()`後の長さ判定を、短絡評価を使う1つの論理式へまとめた。
- `canAddAssignee`の非整数と負数を拒否する2つのガード節を、論理和を使う1つのガード節へまとめた。
- 関数の引数、返り値、上限定数、テストは変更していない。
- 整理後も対象2ファイル・11 tests、全6ファイル・101 tests、lint、typecheck、buildがすべて成功した。

## Refactorの安全網を配布リポジトリで再確認

- 後続の`/test`で追加したテストを残した配布リポジトリの隔離作業ツリーを使用した。
- `canAddAssignee`の拒否条件を、正しい論理和（`||`）から誤った論理積（`&&`）へ一時的に変更した。
- `tests/assignees/limit.test.ts`を実行すると、負数と非整数を拒否する3件がFAILし、残り9件がPASSした。テストが誤った整理を検出できることを確認した。
- 誤変更を破棄して正しい論理和へ戻した後、担当者関連2ファイル・24 testsと全6ファイル・114 testsがPASSした。lint、typecheck、buildも成功した。
- 誤った論理積は配布物へ反映していない。

## 統合テストの前提（後続・本サイクル対象外）

以下は現ハーネス（DB・認証なしの純粋関数テストのみ）では検証不能。純粋関数のPASSだけをもって FR-001/002/003 実装済みとはしない。

- FR-001（追加）/ FR-002（削除）/ FR-003（一覧）の統合テストに必要な前提:
  - `CardAssignee` Prisma モデルと migration（`design/009_assignee.md` § データモデル。`@@unique([cardId, userId])`、Card への `onDelete: Cascade`）。
  - 実 DB（Prisma）または `tests/api/kanban.test.ts` が使う in-memory prisma mock の拡張（CardAssignee テーブル分）。
  - 認証モック（`currentUser`）とボードメンバー判定（`BoardMembership`。User/BoardMembership モデルは後続の認証・招待・権限機能で確定 — spec/009_assignee.md § 未決事項）。
  - Route Handler 実装: `GET/POST /api/cards/[cardId]/assignees`、`DELETE /api/cards/[cardId]/assignees/[userId]`。
- 検証すべき項目（統合テストのRedで書く想定）:
  - POST 成功時 201（または200）で担当者追加、一覧に反映。
  - 同一 `userId` 2回目は 409（重複）。
  - 非ボードメンバーの `userId` は 422 / VALIDATION_ERROR。
  - 担当者10名到達後の11人目追加は 422 / VALIDATION_ERROR（`canAddAssignee` を Route Handler が使う）。
  - 存在しない `cardId` / `userId` は 404 / NOT_FOUND。
  - GET は `{ items: [...] }` 形状で 200（0人時は `{ items: [] }`）。
  - DELETE は 200 で担当者が外れる（未割当でも冪等 200）。
  - 未認証は 401 / UNAUTHORIZED、member 権限なしは 403 / FORBIDDEN（閲覧権限もなければ 404）。
- カード詳細 UI（担当者領域の表示・追加/削除操作）は別途 `ui-design` / `implement` 工程で扱う（本サイクル・本仕様の統合スコープ外の後続工程）。
