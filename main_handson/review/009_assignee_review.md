# 担当者（Assignee） レビューレポート

レビュー日時: 2026-07-21
対象実装: lib/schemas/assignees.ts / lib/assignees/limit.ts / app/boards/[boardId]/page.tsx
対象 design system: brand.json / app/tokens.css / components/layout/AppShell.tsx
対象仕様: spec/009_assignee.md
対象設計: design/009_assignee.md

## サマリー

| 観点 | Critical | Important | Polish |
|---|---|---|---|
| 1. spec 準拠 | 0 | 0 | 1 |
| 2. 実装範囲（完了扱いの誤り） | 0 | 0 | 0 |
| 3. 振る舞い（単体テスト↔仕様） | 0 | 0 | 1 |
| 4. 役割境界（schema/domain/RH/UI） | 0 | 0 | 0 |
| 5. 用語 | 0 | 0 | 0 |
| 6. design token | 0 | 0 | 0 |
| 7. component 一貫 | 0 | 0 | 1 |
| 8. AppShell / layout | 0 | 0 | 0 |

Critical / Important はなし。Polish 3件と、未検証範囲の記録が本レポートの主内容。

## 判定方針

- 担当者の Route Handler・DB・認証・メンバー判定・担当者 UI は本章スコープ外で未実装。これらは「欠落」ではなく「未検証範囲」として §未検証範囲 に記録する（本章は純粋関数 FR-004/005 のみ）。
- 実装済みの純粋関数（`isValidAssigneeUserId` / `canAddAssignee` / `MAX_ASSIGNEES`）は spec・design の契約と一致。

---

## 観点1: spec 準拠

**整合**: `isValidAssigneeUserId`（FR-004）・`canAddAssignee` / `MAX_ASSIGNEES`（FR-005）は spec/009 の該当受入条件と一致。上限は 10 で 1 箇所に定数化。

### P1 [Polish] spec 受入条件が「空白のみ」の扱いを明示していない

- 観点: spec 準拠
- 対象ファイル: spec/009_assignee.md（受入条件 FR-004）／ lib/schemas/assignees.ts
- 問題の理由: 実装は `userId.trim().length > 0` で「空白のみ」を不正扱いにし、design § 純粋関数の契約にも明記があるが、spec の受入条件には「空白のみ→不正」が明示されていない（"空文字" と "非文字列" のみ列挙）。spec↔実装の対応が 1 行分だけ暗黙。
- 修正案: spec/009 の受入条件に「`userId` が空白のみのとき不正（false）を返す（FR-004）」を 1 行追記して design/実装と一致させる。
- 確認が必要な判断点: 「空でない文字列」を trim 基準（空白のみ=不正）で確定してよいか（design はそれで確定済み。spec 追記の可否）。

## 観点2: 実装範囲（未実装・未検証を完了扱いしていないか）

**整合（不一致なし）**: ④ /implement の報告・`.context/tdd/cycles.md` はいずれも「Route Handler・DB・認証・UI は本章対象外／未実装」と明記し、純粋関数の PASS だけで機能実装済みとしていない。完了扱いの誤りは検出されず。→ §未検証範囲 に前提を記録。

## 観点3: 振る舞い（単体テストで観測した範囲と仕様の対応）

**整合**: 単体テストは FR-004（正常/空文字/空白/非文字列）と FR-005（0/9/10/11/負数/非整数、`MAX_ASSIGNEES` 基準の境界）を観測。純粋関数の入出力は spec と対応。

### P2 [Polish] 負数・非整数の拒否は spec 未記載の防御的挙動

- 観点: 振る舞い
- 対象ファイル: spec/009_assignee.md（FR-005 受入条件）／ lib/assignees/limit.ts
- 問題の理由: 実装・テストは `canAddAssignee(-1)` / `canAddAssignee(1.5)` を false にする防御的挙動を持つ。design § 契約には記載があるが、spec 受入条件には「現在9人→許可 / 10人→拒否」しかなく、範囲外入力の扱いが spec に無い。
- 修正案: spec/009 の FR-005 受入条件に「現在の担当者数が範囲外（負数・非整数）のとき追加を拒否する」を追記、または design の記載を正として spec は許容範囲のみ規定と割り切る。
- 確認が必要な判断点: 範囲外入力を spec で規定するか、design/実装の防御的既定に委ねるか。

## 観点4: 役割境界（schema / domain / Route Handler / UI の責務分離）

**整合（不一致なし）**:
- `lib/schemas/assignees.ts` = 入力検証（schema 層）。
- `lib/assignees/limit.ts` = 上限ドメインルール（domain 層、定数集約）。
- Route Handler / UI = 未実装（本章対象外）。
- `app/boards/[boardId]/page.tsx` = データ取得と表示の器のみで、担当者ドメインロジックの混入なし。
- 上限値 10 のハードコード散在なし（`MAX_ASSIGNEES` に一元化）。責務分離は設計どおり。

## 観点5: 用語

**整合（不一致なし）**: constitution.md 用語集「担当者 = Assignee（カードに割り当てられたユーザー）」。spec/design は「担当者（Assignee）」、コードは `assignees` / `CardAssignee`（design）/ `isValidAssigneeUserId` / `canAddAssignee` / `MAX_ASSIGNEES` と英語 Assignee で一貫。表記揺れなし。

## 観点6: design token（色・書体・角丸）

**整合（不一致なし）**:
- `components/layout/AppShell.tsx`: 色は semantic class（`bg-sidebar` / `text-sidebar-foreground` / `bg-primary` / `text-primary-foreground` / `text-muted-foreground` / `border-border` / `border-sidebar-border` / `bg-background` / `hover:bg-sidebar-accent`）、書体は `font-heading`（serif トークン）、角丸は `rounded-md`。hex 直書き・素の色クラスなし。
- `app/boards/[boardId]/page.tsx`: `text-muted-foreground` / `font-heading` 等の semantic のみ。hex なし。
- `brand.json` / `app/tokens.css` の hex は**トークン定義（SSOT）**であり直書きではない（design-system の設計どおり）。

## 観点7: component 一貫

**概ね整合**: board page は BoardHeader / ListCreateForm / BoardWorkspace 等の component 経由で、素の要素の直書きなし。

### P3 [Polish] AppShell の user-footer トリガーが native `<button>`

- 観点: component 一貫
- 対象ファイル: components/layout/AppShell.tsx（88行目付近、`DropdownMenuTrigger` の `render` 子）
- 問題の理由: user footer のドロップダウン開閉トリガーが native `<button>`。ただし token 由来 class（`hover:bg-sidebar-accent` 等）は適用済みで、base-nova の `DropdownMenuTrigger render={<button/>}` パターンとして妥当な例外の範囲。design-system で認めた「素の要素＋token 適用」の許容ラインに収まる。
- 修正案（任意）: 見た目統一を強めるなら `buttonVariants` を当てる、または専用の trigger ラッパに寄せる。現状のままでも token 適用済みで一貫性は保たれる。
- 確認が必要な判断点: この native button を許容例外として据え置くか、buttonVariants 適用に寄せるか。

## 観点8: AppShell / layout 適用一貫

**整合（不一致なし）**:
- `app/boards/[boardId]/page.tsx` は `AppShell` で包み、`user` / `boards` / `activeBoardId` / `breadcrumb`（ボード一覧→ボード名）を渡す。主要 page の layout 規則に一致。
- `app/page.tsx`（ボード一覧）も `AppShell` 包装済み（design-system 工程）。
- 認証系 page（login/signup/members/invite）は**存在しない**。→ 欠落ではなく未作成。作成時は「AppShell を使わず full-screen 中央 + card panel」ルールを適用する旨を §未検証範囲 に記録。

---

## 未検証範囲（欠落ではない・統合実装で扱う）

本章は純粋関数のみが対象。以下は未実装＝未検証範囲であり、欠落と判定しない。

1. **Route Handler**: `GET/POST /api/cards/[cardId]/assignees`、`DELETE /api/cards/[cardId]/assignees/[userId]`（201/409/422/404/401/403、`{ items: [] }`）。
2. **データモデル**: `CardAssignee`（`@@unique([cardId, userId])`、`onDelete: Cascade`）＋ migration。
3. **認証・権限・メンバー判定**: `currentUser`（401）、member/viewer 権限（403）、ボードメンバー判定（非メンバー 422）、User 存在（404）。後続 auth・招待・権限機能に依存。
4. **担当者 UI**: カード詳細モーダルの担当者領域（表示・追加・削除・上限抑止）。`06_assignee_card_modal.png` はこの UI 実装後に撮影。
5. **認証系 page の layout ルール**: 作成時に full-screen 中央 + card panel を適用（AppShell 非使用）。

### 統合テストに必要な前提

- in-memory prisma mock の拡張（`CardAssignee` テーブル、複合ユニーク、cascade）、または実 DB。
- 認証モック（`currentUser`）と `BoardMembership` によるメンバー判定。
- 検証項目: 201 追加 / 409 重複 / 422 非メンバー・上限超過・空 userId / 404 存在なし / 401・403 権限 / `{ items: [] }`。
- 上記は現ハーネス（純粋関数の単体テスト）では観測不能。純粋関数 PASS だけで実装済みとしない（`.context/tdd/cycles.md` の記録と一致）。

## 次のアクション候補

- 実装工程に入る前の確定は不要（Critical / Important なし）。
- Polish P1 / P2 は spec/009 の受入条件に 1〜2 行追記すると spec↔design↔実装の対応が完全になる（採否は任意）。
- P3 は現状維持でも token 適用済みで一貫。
