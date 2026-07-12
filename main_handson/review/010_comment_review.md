# コメント機能レビュー (spec / design / 実装 5 観点突合)

## 対象

- 仕様 = `spec/010_comment.md`
- 設計 = `design/010_comment.md`
- 実装 = 以下 Step 3 で作成 / 更新した file 群
  - Prisma / migration = `prisma/schema.prisma` / `prisma/migrations/20260712194200_add_comment/migration.sql`
  - lib = `lib/comments/escape.ts` / `lib/schemas/comments.ts` / `lib/auth/commentAccess.ts` / `lib/auth/canDeleteComment.ts` / `lib/log/audit.ts`
  - API = `app/api/cards/[cardId]/comments/route.ts` / `app/api/comments/[commentId]/route.ts`
  - UI = `components/cards/CardComments.tsx` / `components/cards/CardDetailModal.tsx`
  - test = `tests/schemas/comments.test.ts` / `tests/comments/escape.test.ts` / `tests/auth/canDeleteComment.test.ts`

## 5 観点サマリ

| 観点 | 判定 | 不一致件数 |
|---|---|---|
| 仕様カバレッジ (spec → design / 実装) | 一部不一致 | 2 |
| 実装カバレッジ (実装 → spec / design) | 一部不一致 | 2 |
| 振る舞い (状態遷移 / 境界 / 応答) | おおむね一致 | 1 |
| 権限境界 (認証 / role / 削除権限) | おおむね一致 | 1 |
| 用語 (spec / design / 実装間の呼称) | 一致 | 0 |

## 不一致 1: 監査ログの `context` フィールド不足

- 観点 = 仕様カバレッジ / 実装カバレッジ
- 対象ファイル = `app/api/cards/[cardId]/comments/route.ts` (POST) / `app/api/comments/[commentId]/route.ts` (DELETE)
- 問題の理由
  - `spec/010_comment.md § 受入条件` 末尾は「コメント投稿・削除に成功すると、操作ログに `event` / `cardId` / `boardId` / `actorId` / `commentId` が記録される」 と要求している。
  - `design/010_comment.md § 監査ログ` は `comment.create` 成功時に `context={ cardId, boardId, authorId }`、`comment.delete` 成功時に `context={ cardId, boardId, authorId, actorId }` を残せと明示している。
  - 実装は `POST` = `context: { cardId }` のみ (`boardId` / `authorId` = `user.id` が欠落)、`DELETE` = `context: { commentId }` のみ (`cardId` / `boardId` / `authorId` / `actorId` が欠落)。
  - `boardId` は `resolveBoardFromCard(cardId)` / `resolveBoardFromComment(commentId)` の返り値 `card.boardId` / `comment.boardId` から取得できる状態にありながら渡していない。
  - また `withApiHandler` の `options.actorId` にも `user.id` を渡していないため、`logAudit` は `actorId=null` を記録する (`design/001_boards.md § 監査ログの共通形式` の「操作ユーザー ID」 に不一致)。
- 修正案
  - `POST /api/cards/{cardId}/comments` 内で `card = await resolveBoardFromCard(cardId)` と `user = await requireCurrentUser(request)` の結果を using して `withApiHandler` の呼び出し側 `context` を `{ cardId, boardId: card.boardId, authorId: user.id }` にする (`actorId: user.id` も併記)。ただし現状の `withApiHandler` は options を Route Handler 先頭で固定するため、`context` を後付けで拡張できるよう `withApiHandler` の signature を「fn の戻り値と共に context を差し戻せる形」 に見直すか、または `logAudit` を Route Handler 内で明示的に呼ぶ経路に切り替える必要がある。
  - `DELETE /api/comments/{commentId}` も同様に `comment = await resolveBoardFromComment(commentId)` の結果から `cardId` / `boardId` / `authorId` を options に流す。
- 確認が必要な判断点
  - 既存の `app/api/cards/[cardId]/route.ts` / `app/api/lists/[listId]/cards/route.ts` 等の他 API も `actorId` / `boardId` を `context` に含めていない (同じ pattern)。本 spec だけで修正するのか、共通ユーティリティ (`withApiHandler`) を含む横断改修とするのかを決める。
  - `withApiHandler` の signature を変更する場合、既存 API 全体に影響が及ぶため、影響範囲を切り分けて別 PR に分けるか判断する。

## 不一致 2: UI 上で `owner` が他人のコメント削除ボタンを表示できない

- 観点 = 仕様カバレッジ / 振る舞い
- 対象ファイル = `components/cards/CardComments.tsx`
- 問題の理由
  - `spec/010_comment.md § FR-04` は「`owner` が他ユーザーの投稿コメントに対して `DELETE /api/comments/{commentId}` を呼ぶと `204` が返る」 を観測可能な完了条件としている。
  - 実装の `CardComments.tsx` は `c.authorId === CURRENT_USER_ID` のみで削除ボタンの表示可否を判定する。owner ロールを持つユーザーであっても、他人が投稿したコメントには削除ボタンが表示されない。
  - `design/010_comment.md § UI 構造 § 主要 Client Component` および `§ 実装方針` に「初期実装では削除ボタンを投稿者本人にのみ表示する。owner による他者削除は API 経由で可能」 と明記されているため、design と実装は一致する。
  - しかし spec § 受入条件「`owner` が他ユーザーの投稿コメントを削除すると `204` が返る」 は API 経由での検証を要求している一方で、`§ 権限境界` 表内「削除権限なし `403`」 に対する UI 導線が定義されていない (UI に owner 経路がないため画面操作で FR-04 の観測条件を満たせない)。
- 修正案
  - 修正案 A (design 追従) = 変更なし。spec の受入条件は API 単体でカバー可能なので API テスト (未実装) で観測条件を満たす、と review 結論する。UI 経路の追加は spec 対象外と判断する。
  - 修正案 B (spec / design 更新) = spec § FR-04 の観測条件に「UI 経路での owner による他者削除は本 spec 対象外 (別 spec でボードメンバーシップ情報のクライアント露出を検討する)」 を追記し、design § 実装方針の判断を再確認する。
  - 修正案 C (実装追加) = ボード詳細ページ (`app/boards/[boardId]/page.tsx`) から `membership.role` を props 経由で `CardDetailModal` → `CardComments` に伝搬し、`c.authorId === CURRENT_USER_ID || currentRole === "owner"` で判定する。
- 確認が必要な判断点
  - 初期実装の粒度としてどこまで UI で owner 経路をサポートするか。CardDetailModal は modal で単独のコンポーネントとして `cardId` のみを受け取る現構造のため、role を渡すには prop drilling が発生する。
  - `NEXT_PUBLIC_DEFAULT_USER_ID` を「現在ユーザー ID の source of truth」 として使う現行の user 識別方式は認証機構本体の別 spec 実装まで暫定である前提を、レビュー時にも共有しておくか。

## 不一致 3: `body` 長判定順序と "invalid_type" 検知の細部

- 観点 = 振る舞い / 実装カバレッジ
- 対象ファイル = `lib/schemas/comments.ts`
- 問題の理由
  - `spec/010_comment.md § バリデーション § body` は「文字列 (`invalid_type` 判定は他フィールドに先行)。トリム後 1〜2000 文字。トリム後 0 は `required`、2001 以上 (元文字列基準) は `too_long`。」 と規定。
  - 実装は superRefine 内で以下の順に判定する。
    1. `undefined` → `required`
    2. `typeof !== "string"` → `invalid_type`
    3. `value.length > 2000` → `too_long`
    4. `value.trim().length === 0` → `required`
  - この順序では「`body` が空白 3000 文字 (2000 超過だがトリム後 0)」 のような input は `too_long` を返す (spec は `required` が正解の可能性がある = 元文字列 3000 文字 → `too_long` でよい / トリム後 0 なので `required` でよい、どちらも spec 表記上正しい)。ただし、spec § 境界条件 「トリム後 0 文字 (空白のみ) → `422` (`required`)」 の直感は「トリム 0 を最優先で `required`」 だが、実装は長さを先に見る。
  - Spec は明示的な判定順を書いていないため、両解釈が可能。テスト (`tests/schemas/comments.test.ts § 境界条件 § "tab-only body → 422 required"`) は 3 文字のタブなので長さ判定を通過し `required` が返る (現実装で合致)。しかし 2001 文字以上の空白 body に対するテストは無く、境界の挙動が spec と一致するかを未確認。
- 修正案
  - 修正案 A (spec 追記) = spec § バリデーションに「判定順は (1) 型 (2) 元文字列長 (3) トリム後長」 と明示する。
  - 修正案 B (実装調整) = 「トリム後 0 文字」 を長さ判定より前に行い、`required` を優先返却する。
  - 修正案 C (テスト追加) = 「2001 文字の空白のみ body」 に対する期待挙動をテストで固定 (`too_long` or `required`)。
- 確認が必要な判断点
  - トリム後 0 かつ元文字列 > 2000 の input に対して、どちらのエラーコードを返すのが利用者にとって意味があるかを spec / design で明確にする。

## 不一致 4: 削除権限判定の rule と実装の comment lag

- 観点 = 権限境界
- 対象ファイル = `lib/auth/canDeleteComment.ts` (実装) / `spec/010_comment.md § 権限境界`
- 問題の理由
  - Spec § 権限境界 は「投稿者本人であっても、投稿後にロールが `viewer` に降格した場合は削除できない (現時点のロールが `member` 以上である必要がある)」 と明記。
  - 実装 `canDeleteComment` の 3 分岐は `owner` → true、`member` かつ actorId==authorId → true、それ以外 → false。`viewer` は常に false を返すため spec と一致。
  - ただし、Route Handler は `assertBoardAccess("viewer")` を通過するとロール取得後に `canDeleteComment` を呼ぶが、`assertBoardAccess("viewer")` は「role >= viewer」 を通す (viewer / member / owner 全て通過)。よって viewer が自分の過去投稿コメントに対して `DELETE` を呼ぶと、assertBoardAccess は通過 (viewer), canDeleteComment は false → 403。spec と一致。
  - 一点、`design § 監査ログ` の削除成功時 log は「actorId は削除者、authorId は投稿者」 と分けて残す方針だが、log context の実装では両者が渡っていない (不一致 1 と重複)。
- 修正案
  - 現実装は spec の権限境界を厳密に満たしているため、判定ロジックの修正は不要。
  - 権限境界のテストとして「viewer + 自投稿 → false」 を `tests/auth/canDeleteComment.test.ts` で既に確認済 (§ viewer § viewer cannot delete own comment)。
  - 監査ログの `authorId` / `actorId` 区別は不一致 1 の修正に含める。
- 確認が必要な判断点
  - 過去に自分が投稿したコメントに対して、UI 上で削除ボタンを見せる可否 (現行は authorId==CURRENT_USER_ID なら見せてしまう)。ロールが viewer に降格した後、UI で削除ボタンを押すと API 側で 403 を返す挙動が spec と整合するが、UX として先に UI 側で禁止する余地がある。判断点。

## 不一致 5: Route Handler の統合テストが未整備

- 観点 = 実装カバレッジ
- 対象ファイル = `tests/` (ディレクトリ全体) / `design/010_comment.md § テスト方針`
- 問題の理由
  - Design § テスト方針 は「Route Handler テストは SQLite テスト DB helper (`tests/helpers/db.ts` 未整備) と連動して別 PR で実施する」 とし、優先度中で本 TDD スコープ外と明記している。
  - 実装は pure 単体テスト (schema / escape / canDeleteComment) 44 件のみが追加され、Route Handler 経路 (POST → DB 保存 → GET で escaped body 返却 / DELETE の権限マトリクス) は未検証。
  - Spec § 受入条件の「投稿された `body` に `<script>alert(1)</script>` を含むと、DB 保存値はエスケープ済み」 「一覧 API のレスポンスは `createdAt` 降順で並ぶ」 等は Route Handler テストなしでは観測不能。
- 修正案
  - 修正案 A (design 通り追認) = 変更なし。Route Handler テスト整備は別 PR で対応する明示の判断を review file に記録する。
  - 修正案 B (最小の DB test 導入) = `tests/helpers/db.ts` の SQLite テスト DB setup helper を新設し、少なくとも「escape が保存経路で 1 回だけ呼ばれる」 「一覧が createdAt desc, id asc で返る」 の 2 ケースを検証する。
- 確認が必要な判断点
  - Route Handler テスト整備の優先度と、他機能 (Board / List / Card / Assignee) の Route Handler テストも同じく未整備である事実を踏まえた統一方針。

## 参考 = 一致確認済み項目 (レビューで差分なし)

以下は spec / design / 実装が一致することを確認済で、修正提案なし。

- HTML エスケープ 5 対象文字 (`&` / `<` / `>` / `"` / `'`) と置換文字列 = 全経路で一致。
- 一覧の並び順 (`createdAt` 降順 / 同時刻 `id` 昇順) = spec § 非機能要件 / design § API 設計 / 実装 `orderBy: [{ createdAt: "desc" }, { id: "asc" }]` が一致。
- `body` の元文字列基準長判定 (2000 上限 / トリム後 1 以上) = spec § 境界条件 / design § API 設計 / 実装 (schema 内で 2000 上限 + trim 0 required) が一致。
- Card `updatedAt` を投稿・削除で更新しない = spec § FR-01 の明示条件 / design § API 設計 の「Card の updatedAt は更新しない」 / 実装 (Route Handler 内で `prisma.card.update` を呼ばない) が一致。
- Comment の物理削除 (soft delete しない) = spec § FR-03 / design § 実装方針 / 実装 (`prisma.comment.delete`) が一致。
- Prisma スキーマの Comment モデルフィールド構成 (`id` / `cardId` / `authorId` / `body` / `createdAt` / `updatedAt`) と `@@index` = design § データモデル / migration SQL / schema.prisma が一致。
- `TargetType` union への `"comment"` 追加 = design § 共通ユーティリティの拡張 / 実装 `lib/log/audit.ts` が一致。
- 権限マトリクス (viewer が GET のみ / member が投稿と自削除 / owner が全削除) = spec § 権限境界 / design § 権限チェックの配置 / 実装 (`assertBoardAccess` + `canDeleteComment`) が一致。
- 用語 (「コメント (Comment)」「本文 (body)」「投稿者 (authorId)」「操作ログ (audit log)」) = spec / design / 実装で一致。

## 実行した確認コマンド

- `npx prisma generate` = 成功 (Prisma Client 再生成)
- `npx prisma migrate dev --name add_comment --skip-seed` = 成功 (`20260712194200_add_comment/migration.sql` 適用)
- `npm test` = 全 116 テスト成功 (本 review 対象の追加 test 44 件を含む)
- `npx tsc --noEmit` = 型エラーなし
- `npm run lint` = 既存 warning 1 件 + 既存 error 1 件 (いずれも `components/cards/CardDetailModal.tsx` / `components/cards/CardRow.tsx` の本 review 対象外の既存問題、`import CardComments` の追加のみが本差分)

## 未実行の確認コマンド

- Route Handler の統合テスト (SQLite テスト DB helper 未整備のため、design § テスト方針の判断に従い本スコープ外)
- E2E テスト (Next.js dev server 起動 + ブラウザ操作) は本 review 対象外
- `npm run build` = 実行していない (dev flow で API 変更は `npm test` + `tsc` で担保する既存方針)

## 作成または更新したファイル

- `review/010_comment_review.md` (新規作成)
