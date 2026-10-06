# Section06 TDD cycles
入力spec009/design009、Vitest include tests/**/*.test.ts。対象2モジュールは存在せず、既存coreテストで相対import/設定が動くことを確認する。
FR004 tests/schemas/assignees.test.ts → isValidAssigneeUserId unknown boolean。
FR005 tests/assignees/limit.test.ts → MAX_ASSIGNEES/canAddAssignee。
API/DB/auth/UIは対象外。統合にはUser/BoardMembership/認証fixture/実DB/Route Handler/browserが必要。

Red: red-control exit0/core7件。red06 exit1、対象2ファイル収集失敗、対象モジュール未実装、アサーション0件実行。パスは設計契約と一致、alias不使用。
Greenへの引継ぎ：2モジュールのみ作成、テスト10件変更禁止。

Green: 対象10/10、全17/17、lint/typecheck/build exit0。2ファイルのみ実装。テスト未変更。
Mutation: WORK内隔離コピーで&&を使う誤ガード、5件中1件FAIL（負数/非整数、expected false received true）exit1。実ソースは誤変更していない。
Refactor: typeof/trimを一式、非整数/負数ガードを||へ統合。対象10/10・全17/17 exit0。テストsha256照合OK。
