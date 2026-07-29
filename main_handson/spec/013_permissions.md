# 権限管理の仕様

## 概要

ボードごとのロール（owner / member / viewer）と、ロールごとの操作権限、owner によるロール変更、最後の owner を降格できない制約、viewer の閲覧専用制約を定義する。

## 既存仕様との関係

- 共通規約（エラー形式・ステータス・入口チェック順序・権限ロール）は `spec/000_shared_rules.md` を参照する。ロール定義そのものは `constitution.md § 権限ポリシー` が正。
- 認証（User / Session）は `spec/011_auth.md`。招待による参加は `spec/012_member_invite.md`。
- 本仕様で **BoardMembership** を確定する。既存仕様（001-009）が参照していた「ボードメンバー」「member 以上」「viewer 以上」の判定はここで定義する実体に従う。

## 対象データ

- BoardMembership（ボードとユーザーの中間テーブル）
  - `id`: string（サーバー採番）
  - `boardId`: string（対象ボード）
  - `userId`: string（対象ユーザー）
  - `role`: string（`owner` / `member` / `viewer`）
  - `createdAt`: datetime
  - `updatedAt`: datetime
  - 同一 `(boardId, userId)` の重複は作らない（ユニーク）。
- ボード作成者は、そのボードの `owner` として BoardMembership が作成される（`spec/001_boards.md` § 操作: ボード作成。ボード作成と同一トランザクション）。
- 各ボードには常に 1 人以上の owner が存在する（最後の owner の降格・削除を禁止）。
- ボード削除時、そのボードの BoardMembership も削除する（`spec/000_shared_rules.md` § 削除の連鎖）。

## ロールと操作権限

`constitution.md § 権限ポリシー` に従う。

| ロール | 実行できる操作 |
|---|---|
| owner | ボードの編集・削除、メンバー招待、ロール変更、メンバー削除、および member ができるすべての操作 |
| member | リスト・カードの作成・編集・移動・アーカイブ・削除／復元、ラベル・期限・担当者の操作、および viewer ができるすべての操作 |
| viewer | 閲覧のみ（一覧・詳細・検索・絞り込み） |

- 権限の強さは `owner > member > viewer`。「member 以上」は owner / member、「viewer 以上」は全ロールを指す。

## 機能要件

### 操作: メンバー一覧の取得（FR-001）

- ボードのメンバー（`userId` / `name` / `email` / `role`）を一覧取得する。
- 完了条件: `{ items: [...] }` 形状でメンバーを返す。

### 操作: ロールの変更（FR-002）

- owner が対象メンバーの `role` を `owner` / `member` / `viewer` のいずれかに変更する。
- 完了条件: 対象 BoardMembership の `role` が更新され、以後その権限で判定される。

### 操作: 最後の owner の降格禁止（FR-003）

- ボードの owner が 1 人だけのとき、その owner を member / viewer に降格できない。
- 完了条件: 該当操作が 409 / CONFLICT で拒否され、`role` が変更されない。

### 操作: メンバーの削除（FR-004）

- owner が対象メンバーをボードから削除する（BoardMembership を削除）。
- ボードの owner が 1 人だけのとき、その owner を削除できない（409）。owner が自分自身を削除する場合も同じ判定を適用する。
- **メンバー自身による自主退出は本仕様の対象外**（削除は owner のみが実行できる）。
- 完了条件: BoardMembership が削除され、対象ユーザーはそのボードにアクセスできなくなる（404）。

### 操作: viewer の閲覧専用制約（FR-005）

- viewer は閲覧系（一覧・詳細・検索）のみ実行できる。書き込み系（作成・編集・移動・削除・復元・アーカイブ・ラベル・期限・担当者の操作）は 403 で拒否する。
- 完了条件: viewer による書き込み系 API が 403 / FORBIDDEN を返し、データが変更されない。

### 操作: 権限に基づくアクセス判定（FR-006）

- 入口チェック順序は「認証 → 対象存在 → 権限 → 入力検証」（`spec/000_shared_rules.md`）。
- ボードのメンバーでないユーザーには、そのボードおよび配下のリソースについて存在を漏らさないため 404 を返す。
- 完了条件: 非メンバーの参照・操作が 404 になり、メンバーだが権限不足の操作が 403 になる。

## 画面

- `/boards/[boardId]/members`（メンバー管理画面。`spec/012_member_invite.md` の招待管理と同一画面）
  - メンバー一覧: 名前 / メールアドレス / ロール。
  - owner のみ、各メンバーのロールを変更（セレクト）・削除できる。
  - 最後の owner の行は、降格・削除の操作を無効化する（実行した場合もサーバーが 409 で拒否）。
  - 自分自身の行は識別できるよう表示する。
- 画面状態: 一覧表示 / 変更中 / エラー表示（403・409）。
- owner 以外がこの画面を開いた場合は、一覧を閲覧のみ（変更操作を表示しない）とする。

## API

| メソッド | パス | 用途 | 必要権限 |
|---|---|---|---|
| GET | /api/boards/[boardId]/members | メンバー一覧の取得 | viewer 以上 |
| PATCH | /api/boards/[boardId]/members/[userId] | ロールの変更（body: `{ role }`） | owner |
| DELETE | /api/boards/[boardId]/members/[userId] | メンバーの削除 | owner |

## 受入条件

- [ ] GET /api/boards/[boardId]/members は `{ items: [...] }` 形状で 200 を返す
- [ ] メンバー一覧の各要素に `userId` / `name` / `email` / `role` が含まれる
- [ ] メンバー一覧のレスポンスに `passwordHash` が含まれない
- [ ] 非メンバーが GET /api/boards/[boardId]/members を呼ぶと 404 / NOT_FOUND を返す
- [ ] 未ログインで GET /api/boards/[boardId]/members を呼ぶと 401 / UNAUTHORIZED を返す
- [ ] owner が PATCH /api/boards/[boardId]/members/[userId] に `role=viewer` を渡すと 200 を返し、ロールが `viewer` に変わる
- [ ] owner が member を `owner` に昇格すると 200 を返し、そのボードの owner が 2 人になる
- [ ] member が PATCH でロールを変更しようとすると 403 / FORBIDDEN を返す
- [ ] viewer が PATCH でロールを変更しようとすると 403 / FORBIDDEN を返す
- [ ] `role` が owner / member / viewer 以外の値のとき 422 / VALIDATION_ERROR を返す
- [ ] 存在しない `userId` のロール変更は 404 / NOT_FOUND を返す
- [ ] 存在しない `boardId` のロール変更は 404 / NOT_FOUND を返す
- [ ] owner が 1 人のボードでその owner を `member` に降格すると 409 / CONFLICT を返し、ロールが変わらない
- [ ] owner が 2 人のボードで一方の owner を `member` に降格すると 200 を返し、降格が成功する
- [ ] owner が 1 人のボードでその owner を削除しようとすると 409 / CONFLICT を返し、メンバーが削除されない
- [ ] owner が 2 人のボードで一方の owner を削除すると 200 を返し、削除が成功する
- [ ] DELETE /api/boards/[boardId]/members/[userId] を owner が実行すると 200 を返し、対象メンバーが一覧から消える
- [ ] 削除されたユーザーがそのボードを取得すると 404 / NOT_FOUND を返す
- [ ] member が DELETE でメンバーを削除しようとすると 403 / FORBIDDEN を返す
- [ ] viewer がボードの編集（PATCH /api/boards/[boardId]）を行うと 403 / FORBIDDEN を返す
- [ ] viewer がリスト作成（POST /api/boards/[boardId]/lists）を行うと 403 / FORBIDDEN を返す
- [ ] viewer がカード作成（POST /api/lists/[listId]/cards）を行うと 403 / FORBIDDEN を返す
- [ ] viewer がカード移動（POST /api/cards/[cardId]/move）を行うと 403 / FORBIDDEN を返す
- [ ] viewer がボードの閲覧（GET /api/boards/[boardId]）を行うと 200 を返す
- [ ] member がボードの削除（DELETE /api/boards/[boardId]）を行うと 403 / FORBIDDEN を返す
- [ ] 非メンバーがボード配下のリソース（リスト・カード）を参照すると 404 / NOT_FOUND を返す
- [ ] ボードを削除すると、そのボードの BoardMembership も削除される
- [ ] member / viewer が自分自身をメンバー削除しようとすると 403 / FORBIDDEN を返す（自主退出は提供しない）

## 異常系

- 未ログインは 401 / UNAUTHORIZED。
- ボードのメンバーでないユーザーの参照・操作は 404 / NOT_FOUND（存在を漏らさない）。
- メンバーだが権限が不足する操作は 403 / FORBIDDEN。
- 存在しない `boardId` / `userId` は 404 / NOT_FOUND。
- `role` が owner / member / viewer 以外は 422 / VALIDATION_ERROR。
- 最後の owner の降格・削除は 409 / CONFLICT。

## 境界条件

- owner が 1 人（最後の owner）: 降格・削除は 409。
- owner が 2 人: 一方の降格・削除は成功。
- 自分自身のロール変更: owner が自分を降格する場合も「最後の owner」判定を適用する（1 人なら 409、2 人以上なら成功）。
- メンバーが自分 1 人（owner のみ）のボード: メンバー一覧は 1 件。
- 権限の境界: viewer は閲覧のみ、member は書き込み可・ボード削除とロール変更は不可、owner はすべて可。

## バリデーション

- `boardId` / `userId`: 必須（パス）。対象が存在しなければ 404。
- `role`: 必須。`owner` / `member` / `viewer` のいずれか。それ以外は 422。
- ロール変更・メンバー削除の前に「最後の owner か」を判定し、該当する場合は 409 で拒否する。

## 権限境界

| 操作 | 必要権限 | 異常時の動作 |
|---|---|---|
| メンバー一覧の取得 | viewer 以上 | 未認証は 401、非メンバーは 404 |
| ロールの変更 | owner | 未認証は 401、member/viewer は 403、非メンバーは 404、対象なしは 404、role 不正は 422、最後の owner の降格は 409 |
| メンバーの削除 | owner | 未認証は 401、member/viewer は 403、非メンバーは 404、対象なしは 404、最後の owner の削除は 409 |
| ボードの編集・削除 | owner | member/viewer は 403（`spec/001_boards.md`） |
| リスト・カードの作成・編集・移動・削除 | member 以上 | viewer は 403（`spec/002_lists.md` / `spec/003_cards.md` / `spec/004_card_movement_archive_restore.md`） |
| 閲覧（一覧・詳細・検索） | viewer 以上 | 非メンバーは 404 |

## ログ

- ロール変更・メンバー削除（成功／失敗）を操作ログに記録する。リクエスト ID を付与する（`spec/000_shared_rules.md` § ログ方針）。
- 記録する項目: リクエスト ID / 操作種別 / `boardId` / 対象 `userId` / 変更前ロール / 変更後ロール / 実行ユーザー `userId` / 結果。
- 権限不足（403）・非メンバー（404）による拒否もログに記録する。
- パスワードハッシュ・セッショントークンをログに出力しない。

## ドキュメント化に必要なユーザー操作

- メンバーの一覧を確認する（メンバー管理画面）。
- メンバーのロールを変更する（owner のみ）。
- メンバーをボードから削除する（owner のみ）。
- 「最後の owner は降格・削除できない」制約と、その対処（先に別のメンバーを owner に昇格する）。
- 権限が足りずに操作できないときの確認手順（自分のロールを確認し、owner に変更を依頼する）。

## 非機能要件

- メンバー一覧取得の応答時間は200ms以内、ロール変更・メンバー削除の応答時間は300ms以内（constitution.md § 性能）。
- 権限判定は「認証 → 対象存在 → 権限 → 入力検証」の順で行う（`spec/000_shared_rules.md`）。
- 閲覧権限のないリソースは存在を漏らさないため 404 を返す。
- 操作ログ・エラーログにリクエスト ID を付与する（`spec/000_shared_rules.md`）。

## 使用する用語

- ボード（Board）（constitution.md § 用語集 参照）
- ロール（owner / member / viewer）（constitution.md § 権限ポリシー 参照）

## 参照する既存ファイル

- constitution.md
- spec/000_shared_rules.md
- spec/001_boards.md
- spec/002_lists.md
- spec/003_cards.md
- spec/004_card_movement_archive_restore.md
- spec/011_auth.md
- spec/012_member_invite.md
- inputs/011_013_auth_invite_permissions_spec_input.md

## 未決事項

- ボード一覧（`GET /api/boards`）の返却範囲は「自分がメンバーのボードのみ」に**確定済み**（`spec/001_boards.md` を更新して反映。ボード作成は認証済みユーザーが実行でき、作成者が owner になる）。
- 既存の各機能 spec（001-009）の「member 以上 / viewer 以上」判定を、本仕様の BoardMembership に接続する実装範囲は設計で確定する。
- メンバーの自主退出は対象外（§ 操作: メンバーの削除）。将来要件で再検討。
